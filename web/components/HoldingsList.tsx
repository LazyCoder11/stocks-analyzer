import React from 'react';
import { Edit, Trash2, HelpCircle, Loader2, Briefcase } from 'lucide-react';

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

interface HoldingsListProps {
  portfolio: Stock[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string, symbol: string) => void;
  onAddTrigger: () => void;
}

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

export const HoldingsList: React.FC<HoldingsListProps> = ({
  portfolio,
  loading,
  onEdit,
  onDelete,
  onAddTrigger,
}) => {
  return (
    <div className="card accent-line-green">
      <div className="card-header">
        <div className="card-title">
          <Briefcase size={14} className="empty-icon" />
          <span>PORTFOLIO ASSETS ({portfolio.length})</span>
        </div>
      </div>
      
      <div className="card-inner" style={{ padding: '0' }}>
        {loading ? (
          <div className="loading-row">
            <Loader2 className="animate-spin" size={16} />
            <span>Syncing live market data...</span>
          </div>
        ) : portfolio.length === 0 ? (
          <div className="empty-state">
            <HelpCircle size={40} className="empty-icon" style={{ color: 'var(--neon-cyan)', opacity: 0.8 }} />
            <div className="empty-text">No active holdings found</div>
            <div className="empty-sub" style={{ marginBottom: '16px' }}>
              Your portfolio is currently empty. Start by adding your first asset!
            </div>
            <button className="btn btn-neon btn-sm" onClick={onAddTrigger}>
              + Add Asset
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="holdings-wrap desktop-table-wrap">
              <table className="holdings-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '16px' }}>Stock / Company</th>
                    <th>Sector</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Avg Price</th>
                    <th style={{ textAlign: 'right' }}>Live Price</th>
                    <th style={{ textAlign: 'right' }}>Current Value</th>
                    <th style={{ textAlign: 'right' }}>Total Returns</th>
                    <th style={{ textAlign: 'right', paddingRight: '16px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((s) => {
                    const live = s.live_price || s.buy_price;
                    const currentValue = live * s.quantity;
                    const pnl = s.pnl !== undefined ? s.pnl : (live - s.buy_price) * s.quantity;
                    const pnlPct = s.pnl_pct !== undefined ? s.pnl_pct : (s.buy_price ? ((live - s.buy_price) / s.buy_price) * 100 : 0);
                    const isUp = pnl >= 0;

                    return (
                      <tr key={s.id}>
                        <td style={{ paddingLeft: '16px' }}>
                          <div className="stock-sym">
                            {s.symbol}
                            <span className={`exchange-tag ${s.exchange}`}>{s.exchange}</span>
                          </div>
                          <div className="stock-name" title={s.company_name}>{s.company_name}</div>
                        </td>
                        <td>
                          <span className="sector-pill">{s.sector || 'Other'}</span>
                        </td>
                        <td className="price-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                          {s.quantity}
                        </td>
                        <td className="price-mono" style={{ textAlign: 'right', color: '#7a7a7a' }}>
                          {fmtDec(s.buy_price)}
                        </td>
                        <td className="price-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                          {fmtDec(live)}
                        </td>
                        <td className="price-mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                          {fmt(currentValue)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={isUp ? 'pnl-up' : 'pnl-down'}>
                            {isUp ? '▲' : '▼'} {pnlPct.toFixed(1)}%
                            <div style={{ fontSize: '9px', opacity: 0.8, fontFamily: 'JetBrains Mono, monospace' }}>
                              {isUp ? '+' : ''}{fmt(pnl)}
                            </div>
                          </span>
                        </td>
                        <td style={{ paddingRight: '16px' }}>
                          <div className="actions-group">
                            <button
                              className="btn-icon edit"
                              onClick={() => onEdit(s.id)}
                              title="Edit Holding"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              className="btn-icon delete"
                              onClick={() => onDelete(s.id, s.symbol)}
                              title="Delete Holding"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-cards-wrap">
              {portfolio.map((s) => {
                const live = s.live_price || s.buy_price;
                const pnl = s.pnl !== undefined ? s.pnl : (live - s.buy_price) * s.quantity;
                const pnlPct = s.pnl_pct !== undefined ? s.pnl_pct : (s.buy_price ? ((live - s.buy_price) / s.buy_price) * 100 : 0);
                const isUp = pnl >= 0;

                return (
                  <div key={s.id} className="mobile-stock-card">
                    <div className="mobile-card-row">
                      <div>
                        <span className="mobile-stock-sym">{s.symbol}</span>
                        <span className={`exchange-tag ${s.exchange}`} style={{ marginLeft: '6px' }}>
                          {s.exchange}
                        </span>
                        <div className="mobile-stock-name">{s.company_name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={isUp ? 'pnl-up' : 'pnl-down'}>
                          {isUp ? '▲' : '▼'} {pnlPct.toFixed(1)}%
                        </div>
                        <div className="mobile-card-sub" style={{ color: isUp ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                          {isUp ? '+' : ''}{fmt(pnl)}
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-details">
                      <div className="detail-col">
                        <span className="detail-label">Qty</span>
                        <span className="detail-val price-mono">{s.quantity}</span>
                      </div>
                      <div className="detail-col">
                        <span className="detail-label">Buy Avg</span>
                        <span className="detail-val price-mono">{fmtDec(s.buy_price)}</span>
                      </div>
                      <div className="detail-col">
                        <span className="detail-label">Live</span>
                        <span className="detail-val price-mono">{fmtDec(live)}</span>
                      </div>
                      <div className="detail-col" style={{ textAlign: 'right' }}>
                        <span className="detail-label">Current</span>
                        <span className="detail-val price-mono" style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>
                          {fmt(live * s.quantity)}
                        </span>
                      </div>
                    </div>

                    {s.notes && (
                      <div className="mobile-card-notes">
                        <span className="notes-label">Notes:</span> {s.notes}
                      </div>
                    )}

                    <div className="mobile-card-actions">
                      <span className="sector-pill">{s.sector || 'Other'}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onEdit(s.id)}
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                        >
                          <Edit size={10} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => onDelete(s.id, s.symbol)}
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                        >
                          <Trash2 size={10} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Embedded CSS for responsive reflow */}
      <style dangerouslySetInnerHTML={{ __html: `
        .desktop-table-wrap {
          display: block;
        }
        .mobile-cards-wrap {
          display: none;
        }
        
        @media (max-width: 640px) {
          .desktop-table-wrap {
            display: none;
          }
          .mobile-cards-wrap {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 12px;
          }
          .mobile-stock-card {
            background: rgba(255, 255, 255, 0.015);
            border: 1px solid var(--border);
            border-radius: var(--r-md);
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .mobile-card-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .mobile-stock-sym {
            font-size: 15px;
            font-weight: 700;
            color: var(--text);
          }
          .mobile-stock-name {
            font-size: 11px;
            color: var(--text-3);
            margin-top: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 180px;
          }
          .mobile-card-sub {
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
          }
          .mobile-card-details {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border-top: 1px dashed var(--border);
            border-bottom: 1px dashed var(--border);
            padding: 8px 0;
            gap: 4px;
          }
          .detail-col {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .detail-label {
            font-size: 9px;
            text-transform: uppercase;
            color: var(--text-3);
            font-weight: 600;
          }
          .detail-val {
            font-size: 11px;
            color: var(--text-2);
          }
          .mobile-card-notes {
            font-size: 11px;
            color: var(--text-2);
            background: rgba(255, 255, 255, 0.01);
            padding: 6px 8px;
            border-radius: var(--r-sm);
            border-left: 2px solid var(--neon-cyan-dim);
          }
          .notes-label {
            font-weight: 700;
            color: var(--text-3);
            font-size: 10px;
            text-transform: uppercase;
          }
          .mobile-card-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        }
      `}} />
    </div>
  );
};
