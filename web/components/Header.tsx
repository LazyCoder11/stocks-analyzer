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
          <TrendingUp size={16} />
        </div>
        <div>
          <div className="brand-name">STOCKO</div>
        </div>
      </div>

      <div className="header-right">
        <div className="status-pill">
          <span className="status-dot" />
          <span>LIVE</span>
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
          title="Refresh Portfolio"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

        <button
          className="btn btn-neon btn-sm"
          onClick={onAddStock}
          title="Add new holding"
        >
          <Plus size={14} />
          <span>Add</span>
        </button>

        <button
          className="btn-icon delete"
          onClick={onLogout}
          title="Log Out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
};
