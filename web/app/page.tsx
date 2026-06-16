'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Plus,
  RefreshCw,
  Wallet,
  LineChart as LineChartIcon,
  Layers,
  Send,
  Briefcase,
  Edit,
  Trash2,
  Loader2,
  Sunrise,
  Sunset,
  LogOut,
  User,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

// Formatters
const fmt = (n: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
};

const fmtDec = (n: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

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

  // Chart Allocations Data Preparation
  const prepareChartData = () => {
    // 1. Sector Allocation Doughnut
    const sectorMap: Record<string, number> = {};
    portfolio.forEach((s) => {
      const sec = s.sector || 'Other';
      const val = (s.live_price || s.buy_price) * s.quantity;
      sectorMap[sec] = (sectorMap[sec] || 0) + val;
    });

    const sectorLabels = Object.keys(sectorMap);
    const sectorValues = Object.values(sectorMap);
    
    const doughnutData = {
      labels: sectorLabels,
      datasets: [
        {
          data: sectorValues,
          backgroundColor: [
            '#6366f1',
            '#06b6d4',
            '#10b981',
            '#f59e0b',
            '#ec4899',
            '#8b5cf6',
            '#3b82f6',
          ],
          borderWidth: 0,
        },
      ],
    };

    // 2. Performance Bar Chart
    const symbols = portfolio.map((s) => s.symbol);
    const investedVals = portfolio.map((s) => s.buy_price * s.quantity);
    const currentVals = portfolio.map((s) => (s.live_price || s.buy_price) * s.quantity);

    const barData = {
      labels: symbols,
      datasets: [
        {
          label: 'Invested',
          data: investedVals,
          backgroundColor: 'rgba(99, 102, 241, 0.4)',
          borderColor: '#6366f1',
          borderWidth: 1,
        },
        {
          label: 'Current',
          data: currentVals,
          backgroundColor: 'rgba(6, 182, 212, 0.5)',
          borderColor: '#06b6d4',
          borderWidth: 1,
        },
      ],
    };

    return { doughnutData, barData };
  };

  if (!mounted) return null;

  // Portfolio Totals Calculation
  const totalInvested = portfolio.reduce((sum, item) => sum + item.buy_price * item.quantity, 0);
  const totalCurrent = portfolio.reduce((sum, item) => sum + (item.live_price || item.buy_price) * item.quantity, 0);
  const totalPnL = totalCurrent - totalInvested;
  const totalPnLPct = totalInvested ? (totalPnL / totalInvested) * 100 : 0;
  const exchanges = Array.from(new Set(portfolio.map((s) => s.exchange))).join(' · ');

  const { doughnutData, barData } = prepareChartData();

  return (
    <div>
      {/* Header */}
      <header>
        <div className="logo">
          <div className="logo-badge">
            <TrendingUp style={{ width: '24px', height: '24px' }} />
          </div>
          <div>
            <h1>Stock Analyzer</h1>
            <span>AI Portfolio Manager</span>
          </div>
        </div>
        <div className="header-actions">
          {user && (
            <div className="user-badge">
              <User style={{ width: '14px', height: '14px' }} />
              {user.email}
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={fetchPortfolio} disabled={loading}>
            <RefreshCw style={{ width: '16px', height: '16px' }} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
            <Plus style={{ width: '16px', height: '16px' }} />
            Add Stock
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleLogout} title="Log Out">
            <LogOut style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </header>

      <div className="main-grid">
        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="header-card">
              <span>Total Invested</span>
              <div className="icon-wrapper">
                <Wallet style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="value">{loading ? '—' : fmt(totalInvested)}</div>
            <div className="sub">Capital committed to holdings</div>
          </div>

          <div className="summary-card accent2">
            <div className="header-card">
              <span>Current Value</span>
              <div className="icon-wrapper">
                <LineChartIcon style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="value">{loading ? '—' : fmt(totalCurrent)}</div>
            <div className="sub">Market valuation of assets</div>
          </div>

          <div className={`summary-card ${totalPnL >= 0 ? 'pnl-green' : 'pnl-red'}`}>
            <div className="header-card">
              <span>Overall Profit &amp; Loss</span>
              <div className="icon-wrapper">
                <TrendingUp style={{ width: '18px', height: '18px', transform: totalPnL >= 0 ? 'none' : 'rotate(90deg)' }} />
              </div>
            </div>
            <div className="value">
              {loading ? '—' : `${totalPnL >= 0 ? '+' : ''}${fmt(totalPnL)}`}
            </div>
            <div className="sub">
              {loading ? '—' : `${totalPnLPct >= 0 ? '+' : ''}${totalPnLPct.toFixed(2)}%`}
            </div>
          </div>

          <div className="summary-card accent2">
            <div className="header-card">
              <span>Holdings &amp; Markets</span>
              <div className="icon-wrapper">
                <Layers style={{ width: '18px', height: '18px' }} />
              </div>
            </div>
            <div className="value">{loading ? '—' : `${portfolio.length} assets`}</div>
            <div className="sub">{loading ? '—' : exchanges || 'No data'}</div>
          </div>
        </div>

        {/* Charts and Telegram Widgets */}
        <div className="dashboard-middle">
          {/* Charts Display */}
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-title">
                <TrendingUp style={{ width: '18px', height: '18px', marginRight: '6px' }} />
                Portfolio Allocations &amp; Performance
              </div>
            </div>
            {portfolio.length === 0 ? (
              <div className="empty-state" style={{ height: '260px' }}>
                <p>Add stocks to see charts representation</p>
              </div>
            ) : (
              <div className="charts-container">
                <div className="chart-wrapper">
                  <Doughnut
                    data={doughnutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            color: '#9ca3af',
                            font: { family: 'Plus Jakarta Sans', weight: 'bold', size: 10 },
                          },
                        },
                        title: {
                          display: true,
                          text: 'SECTOR ALLOCATION',
                          color: '#f3f4f6',
                          font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
                        },
                      },
                    }}
                  />
                </div>
                <div className="chart-wrapper">
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          grid: { display: false },
                          ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } },
                        },
                        y: {
                          grid: { color: 'rgba(255,255,255,0.05)' },
                          ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } },
                        },
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            color: '#9ca3af',
                            font: { family: 'Plus Jakarta Sans', weight: 'bold' },
                          },
                        },
                        title: {
                          display: true,
                          text: 'INVESTED VS CURRENT VALUE',
                          color: '#f3f4f6',
                          font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Telegram Settings display */}
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Send style={{ width: '18px', height: '18px', marginRight: '6px' }} />
                AI Telegram Analysis
              </div>
            </div>
            <div className="tg-widget">
              <div className="tg-steps">
                <div className="tg-step">
                  <div className="tg-step-num">1</div>
                  <div className="tg-step-text">
                    <p>Start Bot Chat</p>
                    <a href="https://t.me/StockoAnalyzerBot" target="_blank" rel="noreferrer">
                      @StockoAnalyzerBot →
                    </a>
                  </div>
                </div>
                <div className="tg-step">
                  <div className="tg-step-num">2</div>
                  <div className="tg-step-text">
                    <p>Copy Your Chat ID</p>
                    <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer">
                      @userinfobot →
                    </a>
                  </div>
                </div>
              </div>

              <div className="tg-input-group">
                <label htmlFor="f-chat-id">Telegram Chat ID</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="f-chat-id"
                    placeholder="Paste Chat ID here..."
                    value={tgChatId}
                    onChange={(e) => setTgChatId(e.target.value)}
                    disabled={updatingTg}
                  />
                  <button className="btn btn-primary" onClick={saveTgChatId} disabled={updatingTg}>
                    {updatingTg ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => triggerAnalysis('morning')}
                  disabled={runningAnalysis !== null}
                >
                  {runningAnalysis === 'morning' ? (
                    <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} />
                  ) : (
                    <Sunrise style={{ width: '16px', height: '16px' }} />
                  )}
                  Morning Run
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => triggerAnalysis('evening')}
                  disabled={runningAnalysis !== null}
                >
                  {runningAnalysis === 'evening' ? (
                    <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} />
                  ) : (
                    <Sunset style={{ width: '16px', height: '16px' }} />
                  )}
                  Evening Run
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Briefcase style={{ width: '18px', height: '18px', marginRight: '6px' }} />
              Asset Holdings
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Qty</th>
                  <th>Buy Price</th>
                  <th>Live Price</th>
                  <th>Profit / Loss</th>
                  <th>Sector</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="loading-price">
                        <Loader2 className="animate-spin" style={{ width: '18px', height: '18px' }} />
                        Loading portfolio data...
                      </div>
                    </td>
                  </tr>
                ) : portfolio.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <HelpCircle style={{ width: '48px', height: '48px', marginBottom: '12px' }} />
                        <p>No active stock holdings in this portfolio.</p>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                          + Add Asset
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  portfolio.map((s) => {
                    const live = s.live_price || s.buy_price;
                    const pnl = s.pnl !== undefined ? s.pnl : (live - s.buy_price) * s.quantity;
                    const pnlPct = s.pnl_pct !== undefined ? s.pnl_pct : (s.buy_price ? ((live - s.buy_price) / s.buy_price) * 100 : 0);
                    const isUp = pnl >= 0;

                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="symbol-block">
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="symbol-text">{s.symbol}</span>
                                <span className={`exchange-badge ${s.exchange}`}>{s.exchange}</span>
                              </div>
                              <div className="company-name">{s.company_name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.quantity}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{fmtDec(s.buy_price)}</td>
                        <td className="price-value">{fmtDec(live)}</td>
                        <td>
                          <span className={`pnl-badge ${isUp ? 'up' : 'down'}`}>
                            {isUp ? '+' : ''}
                            {pnlPct.toFixed(1)}% ({fmt(pnl)})
                          </span>
                        </td>
                        <td>
                          <span className="sector-tag">{s.sector || 'Other'}</span>
                        </td>
                        <td>
                          <div className="btn-actions">
                            <button className="btn-icon" onClick={() => openModal(s.id)} title="Edit">
                              <Edit style={{ width: '14px', height: '14px' }} />
                            </button>
                            <button
                              className="btn-icon delete"
                              onClick={() => deleteStock(s.id, s.symbol)}
                              title="Delete"
                            >
                              <Trash2 style={{ width: '14px', height: '14px' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <div className={`overlay ${modalActive ? 'active' : ''}`} onClick={(e) => e.target === e.currentTarget && closeModal()}>
        <div className="modal">
          <h3>{modalTitle}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="f-symbol">Stock Symbol *</label>
              <input
                id="f-symbol"
                placeholder="e.g. RELIANCE"
                value={fSymbol}
                onChange={(e) => handleSymbolInput(e.target.value, fExchange)}
                style={{ textTransform: 'uppercase' }}
              />
              <div className={`lookup-hint ${lookupHint.type === 'ok' ? 'lookup-ok' : lookupHint.type === 'err' ? 'lookup-err' : ''}`}>
                {lookupHint.type === 'loading' && <Loader2 className="animate-spin" style={{ width: '10px', height: '10px', display: 'inline-block', marginRight: '4px' }} />}
                {lookupHint.type === 'ok' && <Check style={{ width: '10px', height: '10px', display: 'inline-block', marginRight: '4px' }} />}
                {lookupHint.text}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="f-exchange">Exchange *</label>
              <select
                id="f-exchange"
                value={fExchange}
                onChange={(e) => {
                  setFExchange(e.target.value);
                  handleSymbolInput(fSymbol, e.target.value);
                }}
              >
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
              </select>
            </div>

            <div className="form-group full">
              <label htmlFor="f-company">Company Name</label>
              <input
                id="f-company"
                placeholder="Automatically fetched on symbol lookup"
                value={fCompany}
                onChange={(e) => setFCompany(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="f-qty">Quantity *</label>
              <input
                id="f-qty"
                type="number"
                min="0"
                step="any"
                placeholder="10"
                value={fQty}
                onChange={(e) => setFQty(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="f-buy">Average Cost (₹) *</label>
              <input
                id="f-buy"
                type="number"
                min="0"
                step="any"
                placeholder="2450.00"
                value={fBuy}
                onChange={(e) => setFBuy(e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label htmlFor="f-sector">Sector</label>
              <input
                id="f-sector"
                placeholder="e.g. Technology, Banking, Utilities"
                value={fSector}
                onChange={(e) => setFSector(e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label htmlFor="f-notes">Notes</label>
              <input
                id="f-notes"
                placeholder="Enter notes or tags (optional)"
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={closeModal}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveStock}>
              {modalSaveBtnText}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Alert System */}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'error' ? (
              <AlertCircle style={{ width: '16px', height: '16px' }} />
            ) : t.type === 'success' ? (
              <Check style={{ width: '16px', height: '16px' }} />
            ) : (
              <AlertCircle style={{ width: '16px', height: '16px' }} />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
