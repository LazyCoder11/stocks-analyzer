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
      {/* Total Invested */}
      <div className="stat-card">
        <div className="stat-label">Invested</div>
        <div className="stat-value">
          {loading ? '—' : fmt(totalInvested)}
        </div>
        <div className="stat-sub">Committed capital</div>
        <Wallet className="stat-icon" size={20} />
      </div>

      {/* Current Value */}
      <div className="stat-card">
        <div className="stat-label">Current Value</div>
        <div className="stat-value cyan">
          {loading ? '—' : fmt(totalCurrent)}
        </div>
        <div className="stat-sub">Live valuation</div>
        <LineChart className="stat-icon" size={20} />
      </div>

      {/* P&L */}
      <div className="stat-card">
        <div className="stat-label">Net Return</div>
        <div className={`stat-value ${isUp ? 'green' : 'red'}`}>
          {loading ? '—' : `${isUp ? '+' : ''}${fmt(totalPnL)}`}
        </div>
        <div className={`stat-badge ${isUp ? 'up' : 'down'}`}>
          {loading ? '—' : `${isUp ? '▲' : '▼'} ${totalPnLPct.toFixed(2)}%`}
        </div>
        <TrendingUp className="stat-icon" size={20} />
      </div>

      {/* Assets Count */}
      <div className="stat-card">
        <div className="stat-label">Assets</div>
        <div className="stat-value">
          {loading ? '—' : `${assetsCount}`}
        </div>
        <div className="stat-sub">{loading ? '—' : exchanges || 'No active holdings'}</div>
        <Layers className="stat-icon" size={20} />
      </div>
    </div>
  );
};
