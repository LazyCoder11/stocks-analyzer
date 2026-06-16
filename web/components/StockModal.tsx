import React from 'react';
import { Loader2, Check } from 'lucide-react';

interface StockModalProps {
  active: boolean;
  title: string;
  saveBtnText: string;
  symbol: string;
  exchange: string;
  companyName: string;
  quantity: string;
  buyPrice: string;
  sector: string;
  notes: string;
  lookupHint: { text: string; type: 'loading' | 'ok' | 'err' | '' };
  
  onClose: () => void;
  onSymbolChange: (sym: string, exchange: string) => void;
  onExchangeChange: (exchange: string) => void;
  onCompanyNameChange: (val: string) => void;
  onQuantityChange: (val: string) => void;
  onBuyPriceChange: (val: string) => void;
  onSectorChange: (val: string) => void;
  onNotesChange: (val: string) => void;
  onSave: () => void;
}

export const StockModal: React.FC<StockModalProps> = ({
  active,
  title,
  saveBtnText,
  symbol,
  exchange,
  companyName,
  quantity,
  buyPrice,
  sector,
  notes,
  lookupHint,
  onClose,
  onSymbolChange,
  onExchangeChange,
  onCompanyNameChange,
  onQuantityChange,
  onBuyPriceChange,
  onSectorChange,
  onNotesChange,
  onSave,
}) => {
  if (!active) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-sheet">
        {/* Mobile handle indicator */}
        <div className="modal-handle" />

        <div className="modal-title">{title}</div>

        <div className="modal-form-grid">
          {/* Symbol Input */}
          <div className="form-field">
            <label className="form-label" htmlFor="f-symbol">
              Symbol *
            </label>
            <input
              id="f-symbol"
              type="text"
              className="form-input"
              placeholder="e.g. GROWW"
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value.toUpperCase(), exchange)}
              style={{ textTransform: 'uppercase' }}
            />
            <div className={`form-hint ${lookupHint.type === 'ok' ? 'ok' : lookupHint.type === 'err' ? 'err' : ''}`}>
              {lookupHint.type === 'loading' && (
                <Loader2 className="animate-spin" size={10} style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} />
              )}
              {lookupHint.type === 'ok' && (
                <Check size={10} style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} />
              )}
              <span style={{ verticalAlign: 'middle' }}>{lookupHint.text}</span>
            </div>
          </div>

          {/* Exchange Input */}
          <div className="form-field">
            <label className="form-label" htmlFor="f-exchange">
              Exchange *
            </label>
            <select
              id="f-exchange"
              className="form-input"
              value={exchange}
              onChange={(e) => {
                onExchangeChange(e.target.value);
                onSymbolChange(symbol, e.target.value);
              }}
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </div>

          {/* Company Name */}
          <div className="form-field span-2">
            <label className="form-label" htmlFor="f-company">
              Company Name
            </label>
            <input
              id="f-company"
              type="text"
              className="form-input"
              placeholder="Leave blank to auto-fetch"
              value={companyName}
              onChange={(e) => onCompanyNameChange(e.target.value)}
            />
          </div>

          {/* Quantity */}
          <div className="form-field">
            <label className="form-label" htmlFor="f-qty">
              Quantity *
            </label>
            <input
              id="f-qty"
              type="number"
              min="0"
              step="any"
              className="form-input"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
            />
          </div>

          {/* Average Cost */}
          <div className="form-field">
            <label className="form-label" htmlFor="f-buy">
              Buy Price (₹) *
            </label>
            <input
              id="f-buy"
              type="number"
              min="0"
              step="any"
              className="form-input"
              placeholder="0.00"
              value={buyPrice}
              onChange={(e) => onBuyPriceChange(e.target.value)}
            />
          </div>

          {/* Sector */}
          <div className="form-field span-2">
            <label className="form-label" htmlFor="f-sector">
              Sector
            </label>
            <input
              id="f-sector"
              type="text"
              className="form-input"
              placeholder="e.g. Technology, Finance, Energy"
              value={sector}
              onChange={(e) => onSectorChange(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="form-field span-2">
            <label className="form-label" htmlFor="f-notes">
              Notes
            </label>
            <input
              id="f-notes"
              type="text"
              className="form-input"
              placeholder="Add personal notes or labels"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-neon"
            onClick={onSave}
            disabled={!symbol.trim() || !quantity || !buyPrice}
          >
            {saveBtnText}
          </button>
        </div>
      </div>
    </div>
  );
};
