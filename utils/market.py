"""
📈 Market Data & Technical Analysis
Fetches live prices, 52W high/low, RSI, moving averages from Yahoo Finance (free).
"""

import logging
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


def get_live_price(yf_symbol: str) -> float:
    """Get current market price."""
    ticker = yf.Ticker(yf_symbol)
    info = ticker.fast_info
    return round(info.last_price or info.previous_close, 2)


def calculate_rsi(prices: pd.Series, period: int = 14) -> float:
    """Calculate RSI (Relative Strength Index)."""
    delta = prices.diff()
    gain = delta.where(delta > 0, 0).rolling(period).mean()
    loss = -delta.where(delta < 0, 0).rolling(period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return round(rsi.iloc[-1], 1)


def calculate_macd(prices: pd.Series):
    """Calculate MACD line, signal, and histogram."""
    ema12 = prices.ewm(span=12, adjust=False).mean()
    ema26 = prices.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal = macd_line.ewm(span=9, adjust=False).mean()
    histogram = macd_line - signal
    return round(macd_line.iloc[-1], 2), round(signal.iloc[-1], 2), round(histogram.iloc[-1], 2)


def get_trend(prices: pd.Series) -> str:
    """Determine price trend using 20 & 50 day MA."""
    ma20 = prices.rolling(20).mean().iloc[-1]
    ma50 = prices.rolling(50).mean().iloc[-1]
    current = prices.iloc[-1]

    if current > ma20 > ma50:
        return "STRONG UPTREND 📈"
    elif current > ma20 and ma20 < ma50:
        return "RECOVERING ↗️"
    elif current < ma20 < ma50:
        return "STRONG DOWNTREND 📉"
    elif current < ma20 and ma20 > ma50:
        return "WEAKENING ↘️"
    else:
        return "SIDEWAYS ➡️"


def get_support_resistance(prices: pd.Series) -> tuple:
    """Simple support/resistance using recent lows/highs."""
    recent_30 = prices.tail(30)
    support = round(recent_30.min(), 2)
    resistance = round(recent_30.max(), 2)
    return support, resistance


def get_technical_data(symbol_or_yf: str) -> dict:
    """
    Fetch comprehensive technical data for a stock.
    Accepts either 'RELIANCE' or 'RELIANCE.NS'
    """
    yf_symbol = symbol_or_yf if "." in symbol_or_yf else f"{symbol_or_yf}.NS"

    try:
        ticker = yf.Ticker(yf_symbol)

        # Get 1 year of daily data for technicals
        hist = ticker.history(period="1y", interval="1d")
        if hist.empty:
            raise ValueError(f"No historical data for {yf_symbol}")

        closes = hist["Close"]
        volumes = hist["Volume"]

        # Live price
        live_price = round(closes.iloc[-1], 2)

        # 52-week high/low
        high_52w = round(closes.max(), 2)
        low_52w  = round(closes.min(), 2)

        # Moving averages
        ma20  = round(closes.rolling(20).mean().iloc[-1], 2)
        ma50  = round(closes.rolling(50).mean().iloc[-1], 2)
        ma200 = round(closes.rolling(200).mean().iloc[-1], 2) if len(closes) >= 200 else None

        # Volume analysis
        avg_vol_20d  = int(volumes.tail(20).mean())
        today_vol    = int(volumes.iloc[-1])
        vol_vs_avg   = round((today_vol / avg_vol_20d) * 100, 1) if avg_vol_20d else 0

        # Technical indicators
        rsi = calculate_rsi(closes)
        macd_line, macd_signal, macd_hist = calculate_macd(closes)
        trend = get_trend(closes)
        support, resistance = get_support_resistance(closes)

        # % change: day, week, month
        day_change   = round(((closes.iloc[-1] - closes.iloc[-2]) / closes.iloc[-2]) * 100, 2) if len(closes) >= 2 else 0
        week_change  = round(((closes.iloc[-1] - closes.iloc[-6]) / closes.iloc[-6]) * 100, 2) if len(closes) >= 6 else 0
        month_change = round(((closes.iloc[-1] - closes.iloc[-22]) / closes.iloc[-22]) * 100, 2) if len(closes) >= 22 else 0

        # Fundamentals from ticker.info
        info = {}
        try:
            info = ticker.info
        except:
            pass

        return {
            "live_price":    live_price,
            "high_52w":      high_52w,
            "low_52w":       low_52w,
            "ma20":          ma20,
            "ma50":          ma50,
            "ma200":         ma200,
            "rsi":           rsi,
            "macd":          macd_line,
            "macd_signal":   macd_signal,
            "macd_hist":     macd_hist,
            "trend":         trend,
            "support":       support,
            "resistance":    resistance,
            "day_change_pct":   day_change,
            "week_change_pct":  week_change,
            "month_change_pct": month_change,
            "avg_volume_20d":   avg_vol_20d,
            "today_volume":     today_vol,
            "vol_vs_avg_pct":   vol_vs_avg,
            # Fundamentals
            "pe_ratio":       info.get("trailingPE"),
            "pb_ratio":       info.get("priceToBook"),
            "market_cap":     info.get("marketCap"),
            "dividend_yield": info.get("dividendYield"),
            "sector":         info.get("sector", ""),
            "book_value":     info.get("bookValue"),
        }

    except Exception as e:
        logger.warning(f"Could not fetch technical data for {yf_symbol}: {e}")
        # Return minimal data so analysis still runs
        try:
            ticker = yf.Ticker(yf_symbol)
            fast = ticker.fast_info
            return {"live_price": round(fast.last_price or 0, 2)}
        except:
            return {"live_price": 0}
