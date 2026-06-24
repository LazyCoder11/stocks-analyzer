import React from 'react';
import { Wallet, LineChart, TrendingUp, Layers } from 'lucide-react';

interface StatsSummaryProps {
  totalInvested: number;
  totalCurrent: number;
  loading: boolean;
  assetsCount: number;
  exchanges: string;
}

const fmt = (n: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
};

export const StatsSummary: React.FC<StatsSummaryProps> = ({
  totalInvested,
  totalCurrent,
  loading,
  assetsCount,
  exchanges,
}) => {
  const totalPnL = totalCurrent - totalInvested;
  const totalPnLPct = totalInvested ? (totalPnL / totalInvested) * 100 : 0;
  const isUp = totalPnL >= 0;

  return (
    <div className="stats-row">
      {/* Invested */}
      <div className="stat-card">
        <div className="stat-label">Total Invested</div>
        <div className="stat-value">
          {loading ? '—' : fmt(totalInvested)}
        </div>
        <div className="stat-sub">Principal capital cost</div>
        <Wallet className="stat-icon text-slate-400" size={18} />
      </div>

      {/* Current Value */}
      <div className="stat-card pnl-up">
        <div className="stat-label">Current Value</div>
        <div className="stat-value cyan">
          {loading ? '—' : fmt(totalCurrent)}
        </div>
        <div className="stat-sub">Live market valuation</div>
        <LineChart className="stat-icon text-cyan-400" size={18} />
      </div>

      {/* Net Return */}
      <div className={`stat-card ${isUp ? 'pnl-up' : 'pnl-down'}`}>
        <div className="stat-label">Net Returns</div>
        <div className={`stat-value ${isUp ? 'green' : 'red'}`}>
          {loading ? '—' : `${isUp ? '+' : ''}${fmt(totalPnL)}`}
        </div>
        <div className={`stat-badge ${isUp ? 'up' : 'down'}`}>
          {loading ? '—' : `${isUp ? '▲' : '▼'} ${totalPnLPct.toFixed(2)}%`}
        </div>
        <TrendingUp className={`stat-icon ${isUp ? 'text-emerald-400' : 'text-rose-400'}`} size={18} />
      </div>

      {/* Assets Count */}
      <div className="stat-card">
        <div className="stat-label">Active Assets</div>
        <div className="stat-value">
          {loading ? '—' : `${assetsCount}`}
        </div>
        <div className="stat-sub">
          {loading ? '—' : assetsCount === 0 ? 'No active holdings' : `Listed on ${exchanges || 'Exchanges'}`}
        </div>
        <Layers className="stat-icon text-indigo-400" size={18} />
      </div>
    </div>
  );
};
