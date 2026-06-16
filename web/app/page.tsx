'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { StatsSummary } from '@/components/StatsSummary';
import { AllocationCharts } from '@/components/AllocationCharts';
import { TelegramWidget } from '@/components/TelegramWidget';
import { HoldingsList } from '@/components/HoldingsList';
import { StockModal } from '@/components/StockModal';
import { ToastList } from '@/components/ToastList';

interface Stock {
  id: string;
  symbol: string;
  yf_symbol: string;
  company_name: string;
  quantity: number;
  buy_price: number;
  exchange: string;
  sector: string;
  notes: string;
  live_price?: number;
  pnl?: number;
  pnl_pct?: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [portfolio, setPortfolio] = useState<Stock[]>([]);
  const [user, setUser] = useState<{ id: string; email: string; telegram_chat_id?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Telegram Configuration State
  const [tgChatId, setTgChatId] = useState('');
  const [updatingTg, setUpdatingTg] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState<string | null>(null);

  // Modal State
  const [modalActive, setModalActive] = useState(false);
  const [modalTitle, setModalTitle] = useState('Add Asset');
  const [modalSaveBtnText, setModalSaveBtnText] = useState('Add Stock');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields State
  const [fSymbol, setFSymbol] = useState('');
  const [fExchange, setFExchange] = useState('NSE');
  const [fCompany, setFCompany] = useState('');
  const [fQty, setFQty] = useState('');
  const [fBuy, setFBuy] = useState('');
  const [fSector, setFSector] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [lookupHint, setLookupHint] = useState<{ text: string; type: 'loading' | 'ok' | 'err' | '' }>({ text: '', type: '' });
  const lookupTimer = useRef<NodeJS.Timeout | null>(null);

  // Toast System State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Hydration Mount Check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initial Fetch Data
  useEffect(() => {
    if (mounted) {
      fetchUser();
      fetchPortfolio();
    }
  }, [mounted]);

  // Toast Generator
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch Logged-In User Details
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setTgChatId(data.user.telegram_chat_id || '');
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  // Fetch Portfolio Details
  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio');
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      } else {
        showToast('Failed to fetch portfolio data', 'error');
      }
    } catch (error: any) {
      showToast('Network error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save Telegram Chat ID
  const saveTgChatId = async () => {
    setUpdatingTg(true);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramChatId: tgChatId }),
      });
      if (res.ok) {
        showToast('Telegram Chat ID updated successfully', 'success');
        fetchUser();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update Telegram Chat ID', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdatingTg(false);
    }
  };

  // Trigger AI analysis run
  const triggerAnalysis = async (session: 'morning' | 'evening') => {
    if (!tgChatId) {
      showToast('Please set your Telegram Chat ID first!', 'error');
      return;
    }
    setRunningAnalysis(session);
    try {
      const res = await fetch('/api/run-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Analysis started!', 'success');
      } else {
        showToast(data.error || 'Failed to trigger analysis', 'error');
      }
    } catch (error: any) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setRunningAnalysis(null);
    }
  };

  // Symbol Lookup Function
  const handleSymbolInput = (symVal: string, exchVal: string) => {
    setFSymbol(symVal);

    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (!symVal.trim()) {
      setLookupHint({ text: '', type: '' });
      return;
    }

    setLookupHint({ text: 'Verifying ticker symbol...', type: 'loading' });

    lookupTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lookup/${symVal.trim().toUpperCase()}?exchange=${exchVal}`);
        const data = await res.json();
        if (data.valid) {
          setLookupHint({
            text: `Ticker found: ₹${data.live_price}`,
            type: 'ok',
          });
          // Auto fill fields if currently blank
          if (!fCompany.trim()) setFCompany(data.company_name || '');
          if (!fSector.trim()) setFSector(data.sector || '');
        } else {
          setLookupHint({ text: data.error || 'Symbol verification failed', type: 'err' });
        }
      } catch (error) {
        setLookupHint({ text: 'Lookup service unavailable', type: 'err' });
      }
    }, 600);
  };

  // Open Add/Edit Modal
  const openModal = (stockId: string | null = null) => {
    setEditingId(stockId);
    setLookupHint({ text: '', type: '' });

    if (stockId) {
      setModalTitle('Edit Asset Details');
      setModalSaveBtnText('Save Changes');

      const s = portfolio.find((x) => x.id === stockId);
      if (s) {
        setFSymbol(s.symbol);
        setFExchange(s.exchange);
        setFCompany(s.company_name);
        setFQty(s.quantity.toString());
        setFBuy(s.buy_price.toString());
        setFSector(s.sector);
        setFNotes(s.notes);
      }
    } else {
      setModalTitle('Add Asset');
      setModalSaveBtnText('Add Stock');
      setFSymbol('');
      setFExchange('NSE');
      setFCompany('');
      setFQty('');
      setFBuy('');
      setFSector('');
      setFNotes('');
    }
    setModalActive(true);
  };

  const closeModal = () => {
    setModalActive(false);
  };

  // Save Stock (create or update)
  const saveStock = async () => {
    if (!fSymbol.trim() || !fQty || !fBuy) {
      showToast('Stock symbol, quantity, and buy price are required', 'error');
      return;
    }

    const payload = {
      symbol: fSymbol.trim().toUpperCase(),
      exchange: fExchange,
      company_name: fCompany.trim(),
      quantity: parseFloat(fQty),
      buy_price: parseFloat(fBuy),
      sector: fSector.trim(),
      notes: fNotes.trim(),
    };

    try {
      const url = editingId ? `/api/portfolio/${editingId}` : '/api/portfolio';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(
          editingId ? 'Stock updated successfully' : 'Stock added to portfolio',
          'success'
        );
        closeModal();
        fetchPortfolio();
      } else {
        showToast(data.error || 'Failed to save stock', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Delete Stock
  const deleteStock = async (stockId: string, symbol: string) => {
    if (!confirm(`Are you sure you want to delete ${symbol} from your portfolio?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/portfolio/${stockId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`${symbol} removed from portfolio`, 'success');
        fetchPortfolio();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete stock', 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        showToast('Logged out successfully', 'success');
        router.push('/login');
        router.refresh();
      } else {
        showToast('Logout failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (!mounted) return null;

  // Portfolio Totals Calculation
  const totalInvested = portfolio.reduce((sum, item) => sum + item.buy_price * item.quantity, 0);
  const totalCurrent = portfolio.reduce((sum, item) => sum + (item.live_price || item.buy_price) * item.quantity, 0);
  const exchanges = Array.from(new Set(portfolio.map((s) => s.exchange))).join(' · ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header component */}
      <Header
        user={user}
        loading={loading}
        onRefresh={fetchPortfolio}
        onAddStock={() => openModal()}
        onLogout={handleLogout}
      />

      {/* Main dashboard content container */}
      <main className="dashboard">
        {/* Stats Row */}
        <StatsSummary
          totalInvested={totalInvested}
          totalCurrent={totalCurrent}
          loading={loading}
          assetsCount={portfolio.length}
          exchanges={exchanges}
        />

        {/* Telegram Widget */}
        <TelegramWidget
          tgChatId={tgChatId}
          setTgChatId={setTgChatId}
          updatingTg={updatingTg}
          runningAnalysis={runningAnalysis}
          onSaveChatId={saveTgChatId}
          onTriggerAnalysis={triggerAnalysis}
        />

        {/* Allocations & Charts */}
        <AllocationCharts portfolio={portfolio} />

        {/* Portfolio Assets List */}
        <HoldingsList
          portfolio={portfolio}
          loading={loading}
          onEdit={openModal}
          onDelete={deleteStock}
          onAddTrigger={() => openModal()}
        />
      </main>

      {/* Stock Form Modal Bottom Sheet */}
      <StockModal
        active={modalActive}
        title={modalTitle}
        saveBtnText={modalSaveBtnText}
        symbol={fSymbol}
        exchange={fExchange}
        companyName={fCompany}
        quantity={fQty}
        buyPrice={fBuy}
        sector={fSector}
        notes={fNotes}
        lookupHint={lookupHint}
        onClose={closeModal}
        onSymbolChange={handleSymbolInput}
        onExchangeChange={setFExchange}
        onCompanyNameChange={setFCompany}
        onQuantityChange={setFQty}
        onBuyPriceChange={setFBuy}
        onSectorChange={setFSector}
        onNotesChange={setFNotes}
        onSave={saveStock}
      />

      {/* Toasts */}
      <ToastList toasts={toasts} />
    </div>
  );
}