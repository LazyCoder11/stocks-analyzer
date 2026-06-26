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
      {/* Brand logo at the top */}
      {/* <div className="header-brand">
        <div className="brand-logo" title="STOCKO AI PORTFOLIO ANALYSIS">
          <TrendingUp size={20} className="text-white" />
        </div>
      </div> */}

      {/* Main navigation / actions in the middle */}
      <div className="header-actions">
        <button
          className="btn-action-primary"
          onClick={onAddStock}
          title="Add New Stock Asset"
        >
          <Plus size={18} />
        </button>

        <button
          className="btn-action-sec"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Portfolio Data"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
        </button>
      </div>

      {/* Profile & Settings at the bottom */}
      <div className="header-footer">
        {user && (
          <div className="user-profile-trigger" title={user.email}>
            <div className="user-avatar">{emailInitial}</div>
            <span className="status-dot-indicator" title="Connected" />
          </div>
        )}

        <button
          className="btn-action-danger"
          onClick={onLogout}
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
