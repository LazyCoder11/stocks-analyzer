import React from 'react';
import { Send, Sunrise, Sunset, Loader2 } from 'lucide-react';

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
          <span>TELEGRAM REPORTS</span>
        </div>
      </div>
      <div className="card-inner">
        <div className="tg-steps">
          <div className="tg-step">
            <div className="tg-num">1</div>
            <div className="tg-step-body">
              <div className="tg-step-label">Start Bot Chat</div>
              <a
                href="https://t.me/StockoAnalyzerBot"
                target="_blank"
                rel="noreferrer"
                className="tg-step-link"
              >
                @StockoAnalyzerBot →
              </a>
            </div>
          </div>
          <div className="tg-step">
            <div className="tg-num">2</div>
            <div className="tg-step-body">
              <div className="tg-step-label">Find Your Chat ID</div>
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noreferrer"
                className="tg-step-link"
              >
                @userinfobot →
              </a>
            </div>
          </div>
        </div>

        <div className="form-field" style={{ marginBottom: '16px' }}>
          <label className="form-label" htmlFor="tg-chat-id">
            Telegram Chat ID
          </label>
          <div className="tg-input-row">
            <input
              id="tg-chat-id"
              type="text"
              className="form-input"
              placeholder="e.g. 987654321"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              disabled={updatingTg}
            />
            <button
              className="btn btn-cyan btn-sm"
              onClick={onSaveChatId}
              disabled={updatingTg || !tgChatId.trim()}
            >
              {updatingTg ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="analysis-btns">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onTriggerAnalysis('morning')}
            disabled={runningAnalysis !== null}
          >
            {runningAnalysis === 'morning' ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Sunrise size={14} />
            )}
            <span>Morning Run</span>
          </button>

          <button
            className="btn btn-neon btn-sm"
            onClick={() => onTriggerAnalysis('evening')}
            disabled={runningAnalysis !== null}
          >
            {runningAnalysis === 'evening' ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Sunset size={14} />
            )}
            <span>Evening Run</span>
          </button>
        </div>
      </div>
    </div>
  );
};
