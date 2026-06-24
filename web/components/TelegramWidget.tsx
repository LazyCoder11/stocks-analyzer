import React from 'react';
import { Send, Sunrise, Sunset, Loader2, ArrowRight } from 'lucide-react';

interface TelegramWidgetProps {
  tgChatId: string;
  setTgChatId: (val: string) => void;
  updatingTg: boolean;
  runningAnalysis: string | null;
  onSaveChatId: () => void;
  onTriggerAnalysis: (session: 'morning' | 'evening') => void;
}

export const TelegramWidget: React.FC<TelegramWidgetProps> = ({
  tgChatId,
  setTgChatId,
  updatingTg,
  runningAnalysis,
  onSaveChatId,
  onTriggerAnalysis,
}) => {
  return (
    <div className="card accent-line-green">
      {/* Header with status badge */}
      <div className="card-header flex items-center justify-between">
        <div className="card-title flex items-center gap-1.5">
          <Send size={14} className="text-emerald-400" />
          <span>Telegram Reports</span>
        </div>
        {tgChatId.trim() ? (
          <span className="status-badge-active" title="Connected to chat ID">
            <span className="status-dot-green" />
            LINKED
          </span>
        ) : (
          <span className="status-badge-inactive" title="No Telegram chat ID configured">
            <span className="status-dot-amber" />
            UNLINKED
          </span>
        )}
      </div>

      <div className="card-inner">
        {/* Setup Guide */}
        <div className="tg-steps">
          <div className="tg-step">
            <div className="tg-num">1</div>
            <div className="tg-step-body">
              <div className="tg-step-label">Connect to AI Bot</div>
              <a
                href="https://t.me/StockoAnalyzerBot"
                target="_blank"
                rel="noreferrer"
                className="tg-step-link"
              >
                Start @StockoAnalyzerBot <ArrowRight size={10} style={{ marginLeft: '2px' }} />
              </a>
            </div>
          </div>
          <div className="tg-step">
            <div className="tg-num">2</div>
            <div className="tg-step-body">
              <div className="tg-step-label">Get Chat ID</div>
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noreferrer"
                className="tg-step-link"
              >
                Send message to @userinfobot <ArrowRight size={10} style={{ marginLeft: '2px' }} />
              </a>
            </div>
          </div>
        </div>

        {/* Input binding */}
        <div className="form-field" style={{ marginBottom: '20px' }}>
          <label className="form-label" htmlFor="tg-chat-id">
            Telegram Chat ID
          </label>
          <div className="tg-input-row">
            <input
              id="tg-chat-id"
              type="text"
              className="form-input font-mono"
              placeholder="Enter numeric Chat ID (e.g. 98765432)"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              disabled={updatingTg}
              style={{ letterSpacing: '0.05em' }}
            />
            <button
              className="btn btn-cyan btn-sm"
              onClick={onSaveChatId}
              disabled={updatingTg || !tgChatId.trim()}
              style={{ padding: '0 16px', height: '34px' }}
            >
              {updatingTg ? (
                <Loader2 className="animate-spin" size={12} />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>

        {/* Analysis Description & Buttons */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '18px', marginTop: '16px' }}>
          <div className="form-label" style={{ marginBottom: '12px' }}>Trigger Manual Updates</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Morning Pre-Open card */}
            <div className="automation-card">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sunrise size={14} className="text-amber-400" />
                  Morning Pre-Open
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2.5px', fontWeight: 500 }}>
                  Analysis on global market indicators.
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onTriggerAnalysis('morning')}
                disabled={runningAnalysis !== null}
                style={{ minWidth: '104px', height: '32px' }}
              >
                {runningAnalysis === 'morning' ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <span>Morning Run</span>
                )}
              </button>
            </div>

            {/* Evening Closing card */}
            <div className="automation-card">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sunset size={14} className="text-violet-400" />
                  Evening Closing
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2.5px', fontWeight: 500 }}>
                  Post-close technical summary report.
                </div>
              </div>
              <button
                className="btn btn-neon btn-sm"
                onClick={() => onTriggerAnalysis('evening')}
                disabled={runningAnalysis !== null}
                style={{ minWidth: '104px', height: '32px' }}
              >
                {runningAnalysis === 'evening' ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <span>Evening Run</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
