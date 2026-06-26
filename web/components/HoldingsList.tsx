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
          <span>PORTFOLIO ASSETS ({portfolio.length})</span>
        </div>
      </div>

      <div className="card-inner" style={{ padding: '0' }}>
        {loading ? (
          <div className="loading-row">
            <Loader2 className="animate-spin text-emerald-400" size={16} />
            <span>Syncing live market data...</span>
          </div>
        ) : portfolio.length === 0 ? (
          <div className="empty-state">
            <HelpCircle size={40} className="text-cyan-400 animate-pulse" style={{ opacity: 0.8 }} />
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
                    <th style={{ paddingLeft: '20px' }}>Stock / Company</th>
                    {/* <th>Sector</th> */}
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Avg Price</th>
                    <th style={{ textAlign: 'right' }}>Live Price</th>
                    <th style={{ textAlign: 'right' }}>Current Value</th>
                    <th style={{ textAlign: 'right' }}>Total Returns</th>
                    <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((s) => {
                    const live = s.live_price || s.buy_price;
                    const currentValue = live * s.quantity;
                    const pnl = s.pnl !== undefined ? s.pnl : (live - s.buy_price) * s.quantity;
                    const pnlPct = s.pnl_pct !== undefined ? s.pnl_pct : (s.buy_price ? ((live - s.buy_price) / s.buy_price) * 100 : 0);
                    const isUp = pnl >= 0;

                    // Generate clean sector class for badge styling
                    const sectorClass = s.sector ? s.sector.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : 'other';

                    return (
                      <tr key={s.id} className={isUp ? 'row-pnl-up' : 'row-pnl-down'}>
                        <td style={{ paddingLeft: '20px' }}>
                          <div className="stock-sym">
                            {s.symbol}
                            <span className={`exchange-tag ${s.exchange}`}>{s.exchange}</span>
                          </div>
                          <div className="stock-name" title={s.company_name}>{s.company_name}</div>
                        </td>
                        {/* <td>
                          <span className={`sector-pill ${sectorClass}`}>{s.sector || 'Other'}</span>
                        </td> */}
                        <td className="  text-white" style={{ textAlign: 'right', fontWeight: 600 }}>
                          {s.quantity}
                        </td>
                        <td className="  text-slate-500" style={{ textAlign: 'right' }}>
                          {fmtDec(s.buy_price)}
                        </td>
                        <td className="  text-slate-200" style={{ textAlign: 'right', fontWeight: 600 }}>
                          {fmtDec(live)}
                        </td>
                        <td className="  text-cyan-400" style={{ textAlign: 'right', fontWeight: 700 }}>
                          {fmt(currentValue)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={isUp ? 'pnl-badge-up' : 'pnl-badge-down'}>
                            {isUp ? '+' : ''}{fmt(pnl)}
                            <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '1px' }}>
                              {isUp ? '▲' : '▼'} {pnlPct.toFixed(1)}%
                            </div>
                          </span>
                        </td>
                        <td style={{ paddingRight: '20px' }}>
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
                const sectorClass = s.sector ? s.sector.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : 'other';

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
                        <div className="mobile-card-sub" style={{ color: isUp ? 'var(--neon-green)' : 'var(--neon-red)', fontWeight: 600 }}>
                          {isUp ? '+' : ''}{fmt(pnl)}
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-details">
                      <div className="detail-col">
                        <span className="detail-label">Qty</span>
                        <span className="detail-val   font-bold text-slate-200">{s.quantity}</span>
                      </div>
                      <div className="detail-col">
                        <span className="detail-label">Buy Avg</span>
                        <span className="detail-val  ">{fmtDec(s.buy_price)}</span>
                      </div>
                      <div className="detail-col">
                        <span className="detail-label">Live</span>
                        <span className="detail-val   font-bold text-slate-200">{fmtDec(live)}</span>
                      </div>
                      <div className="detail-col" style={{ textAlign: 'right' }}>
                        <span className="detail-label">Current</span>
                        <span className="detail-val   text-cyan-400 font-bold">
                          {fmt(live * s.quantity)}
                        </span>
                      </div>
                    </div>

                    {s.notes && (
                      <div className="mobile-card-notes" style={{ borderLeft: `2px solid ${isUp ? 'var(--neon-green)' : 'var(--neon-red)'}` }}>
                        <span className="notes-label">Notes:</span> {s.notes}
                      </div>
                    )}

                    <div className="mobile-card-actions">
                      <span className={`sector-pill ${sectorClass}`}>{s.sector || 'Other'}</span>
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
      <style dangerouslySetInnerHTML={{
        __html: `
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
            gap: 12px;
            padding: 16px;
          }
          .mobile-stock-card {
            background: rgba(255, 255, 255, 0.015);
            border: 1px solid var(--border);
            border-radius: var(--r-md);
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: all 0.2s ease;
          }
          .mobile-stock-card:hover {
            border-color: rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.025);
          }
          .mobile-card-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .mobile-stock-sym {
            font-size: 15px;
            font-weight: 800;
            color: #fff;
            letter-spacing: -0.01em;
          }
          .mobile-stock-name {
            font-size: 11px;
            color: var(--text-secondary);
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 180px;
            font-weight: 500;
          }
          .mobile-card-sub {
            font-size: 11px;
          }
          .mobile-card-details {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            padding: 10px 0;
            gap: 6px;
          }
          .detail-col {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .detail-label {
            font-size: 8px;
            text-transform: uppercase;
            color: var(--text-muted);
            font-weight: 700;
            letter-spacing: 0.05em;
          }
          .detail-val {
            font-size: 11.5px;
            color: var(--text-secondary);
          }
          .mobile-card-notes {
            font-size: 11px;
            color: var(--text-secondary);
            background: rgba(255, 255, 255, 0.01);
            padding: 8px 12px;
            border-radius: var(--r-sm);
          }
          .notes-label {
            font-weight: 800;
            color: var(--text-muted);
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .mobile-card-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 4px;
          }
        }
      `}} />
    </div>
  );
};
