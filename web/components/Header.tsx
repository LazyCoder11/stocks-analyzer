import React from 'react';
import { TrendingUp, RefreshCw, Plus, LogOut } from 'lucide-react';

interface HeaderProps {
  user: { email: string } | null;
  loading: boolean;
  onRefresh: () => void;
  onAddStock: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  loading,
  onRefresh,
  onAddStock,
  onLogout,
}) => {
  const emailInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <TrendingUp size={18} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="brand-name">STOCKO</div>
          <div className="brand-sub">AI PORTFOLIO ANALYSIS</div>
        </div>
      </div>

      <div className="header-right">
        <div className="status-pill">
          <span className="status-dot" />
          <span>CONNECTED</span>
        </div>

        {user && (
          <div className="user-chip" title={user.email}>
            <div className="user-avatar">{emailInitial}</div>
            <span className="user-email">{user.email}</span>
          </div>
        )}

        <button
          className="btn-icon"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Portfolio Data"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : 'text-slate-400'} />
        </button>

        <button
          className="btn btn-neon btn-sm"
          onClick={onAddStock}
          title="Add New Stock Asset"
        >
          <Plus size={14} />
          <span>Add Asset</span>
        </button>

        <button
          className="btn-icon delete"
          onClick={onLogout}
          title="Logout"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
};
