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
      <div className="card-header">
        <div className="card-title">
          <Send size={14} className="empty-icon" />
          <span>AI Telegram Reports</span>
        </div>
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
                Start @StockoAnalyzerBot <ArrowRight size={10} style={{ display: 'inline-block' }} />
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
                Send message to @userinfobot <ArrowRight size={10} style={{ display: 'inline-block' }} />
              </a>
            </div>
          </div>
        </div>

        {/* Input binding */}
        <div className="form-field" style={{ marginBottom: '18px' }}>
          <label className="form-label" htmlFor="tg-chat-id">
            Telegram Chat ID
          </label>
          <div className="tg-input-row">
            <input
              id="tg-chat-id"
              type="text"
              className="form-input"
              placeholder="Enter your numeric Chat ID (e.g. 98765432)"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              disabled={updatingTg}
            />
            <button
              className="btn btn-cyan btn-sm"
              onClick={onSaveChatId}
              disabled={updatingTg || !tgChatId.trim()}
              style={{ padding: '0 16px', height: '34px' }}
            >
              {updatingTg ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Analysis Description & Buttons */}
        <div style={{ borderTop: '1px solid border-white/[0.07]', paddingTop: '14px', marginTop: '12px' }}>
          <div className="form-label" style={{ marginBottom: '8px' }}>Trigger Manual Updates</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f0f0f0' }}>Morning Pre-Open</div>
                <div style={{ fontSize: '10px', color: '#7a7a7a' }}>Analysis on global market indicators.</div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onTriggerAnalysis('morning')}
                disabled={runningAnalysis !== null}
                style={{ minWidth: '110px' }}
              >
                {runningAnalysis === 'morning' ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <Sunrise size={12} />
                )}
                <span style={{ marginLeft: '4px' }}>Morning Run</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f0f0f0' }}>Evening Closing</div>
                <div style={{ fontSize: '10px', color: '#7a7a7a' }}>Post-close technical summary report.</div>
              </div>
              <button
                className="btn btn-neon btn-sm"
                onClick={() => onTriggerAnalysis('evening')}
                disabled={runningAnalysis !== null}
                style={{ minWidth: '110px' }}
              >
                {runningAnalysis === 'evening' ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <Sunset size={12} />
                )}
                <span style={{ marginLeft: '4px' }}>Evening Run</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
