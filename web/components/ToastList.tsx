import React from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastListProps {
  toasts: Toast[];
}

export const ToastList: React.FC<ToastListProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && <Check size={14} style={{ flexShrink: 0 }} />}
          {t.type === 'error' && <AlertCircle size={14} style={{ flexShrink: 0 }} />}
          {t.type === 'info' && <Info size={14} style={{ flexShrink: 0 }} />}
          <span style={{ wordBreak: 'break-word' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
};
