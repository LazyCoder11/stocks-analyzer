"""
💹 Price Fetcher — NSE India Live Price Engine
==============================================
Primary source : NSE India public REST API (real-time during market hours)
Fallback source: yfinance fast_info (for BSE / ETFs / indices)

Usage
-----
    from utils.price_fetcher import price_fetcher

    price_fetcher.start(symbols=["RELIANCE.NS", "BAJAJFIN.NS"])
    price  = price_fetcher.get_price("RELIANCE.NS")   # → 1316.50
    prices = price_fetcher.get_all_prices()            # → { symbol: price, ... }
    open_  = price_fetcher.is_market_open()            # → True / False

The background thread refreshes prices every REFRESH_INTERVAL_SECONDS
while the market is open, and pauses outside trading hours.
"""

import logging
import threading
import time
from datetime import datetime, time as dtime
from zoneinfo import ZoneInfo

import requests
import yfinance as yf

logger = logging.getLogger(__name__)

# ─── Constants ─────────────────────────────────────────────────────────────────

IST = ZoneInfo("Asia/Kolkata")

MARKET_OPEN  = dtime(9, 15)   # NSE opens 9:15 AM IST
MARKET_CLOSE = dtime(15, 31)  # NSE closes 3:30 PM IST (buffer +1 min)

REFRESH_INTERVAL_OPEN   = 30   # seconds — during market hours
REFRESH_INTERVAL_CLOSED = 300  # seconds — outside market hours

NSE_QUOTE_URL = "https://www.nseindia.com/api/quote-equity?symbol={symbol}"
NSE_HOME_URL  = "https://www.nseindia.com"

# Browser-like headers required by NSE to avoid 401/403
NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.nseindia.com/",
    "DNT": "1",
    "Connection": "keep-alive",
}


# ─── Price Fetcher ─────────────────────────────────────────────────────────────

class PriceFetcher:
    """
    Singleton price engine.
    Maintains an NSE session and a background refresh thread.
    """

    def __init__(self):
        self._cache: dict[str, float] = {}       # { "RELIANCE.NS": 1316.50 }
        self._symbols: list[str] = []            # yf-style symbols
        self._last_refreshed: datetime | None = None
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._session: requests.Session = self._make_session()

    # ── Session Management ─────────────────────────────────────────────────────

    def _make_session(self) -> requests.Session:
        """Create a persistent requests.Session with NSE cookies pre-loaded."""
        session = requests.Session()
        session.headers.update(NSE_HEADERS)
        try:
            # Visit homepage to set session cookies (NSE requires this)
            session.get(NSE_HOME_URL, timeout=8)
            logger.info("NSE session initialised (cookies set).")
        except Exception as e:
            logger.warning(f"NSE session warm-up failed: {e} — will retry on first fetch.")
        return session

    def _refresh_session(self):
        """Re-warm the session (call if NSE returns 401/403)."""
        self._session = self._make_session()

    # ── Market Hours ───────────────────────────────────────────────────────────

    @staticmethod
    def is_market_open() -> bool:
        """True during NSE trading hours (Mon–Fri, 9:15–15:30 IST)."""
        now = datetime.now(IST)
        if now.weekday() >= 5:          # Saturday=5, Sunday=6
            return False
        t = now.time().replace(tzinfo=None)
        return MARKET_OPEN <= t <= MARKET_CLOSE

    # ── NSE Price Fetch ────────────────────────────────────────────────────────

    def _fetch_nse(self, symbol: str) -> float | None:
        """
        Fetch live price from NSE API.
        symbol must be bare NSE ticker, e.g. 'RELIANCE' (not 'RELIANCE.NS').
        Returns price float or None on failure.
        """
        url = NSE_QUOTE_URL.format(symbol=symbol.upper())
        try:
            resp = self._session.get(url, timeout=6)
            if resp.status_code in (401, 403):
                logger.warning("NSE session expired — refreshing cookies.")
                self._refresh_session()
                resp = self._session.get(url, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                # NSE API nests price in priceInfo → lastPrice
                price = (
                    data.get("priceInfo", {}).get("lastPrice")
                    or data.get("priceInfo", {}).get("previousClose")
                )
                if price is not None:
                    return round(float(price), 2)
        except Exception as e:
            logger.debug(f"NSE fetch failed for {symbol}: {e}")
        return None

    def _fetch_yfinance(self, yf_symbol: str) -> float | None:
        """Fallback: fetch price via yfinance fast_info."""
        try:
            fi = yf.Ticker(yf_symbol).fast_info
            price = fi.last_price or fi.previous_close
            return round(float(price), 2) if price else None
        except Exception as e:
            logger.debug(f"yfinance fetch failed for {yf_symbol}: {e}")
            return None

    def _fetch_price(self, yf_symbol: str) -> float | None:
        """
        Fetch a single price.
        Strategy:
          • .NS  → try NSE API first, yfinance fallback
          • .BO  → yfinance only (BSE not supported by NSE equity API)
          • Other (indices, ETFs) → yfinance only
        """
        if yf_symbol.endswith(".NS"):
            bare = yf_symbol[:-3]
            price = self._fetch_nse(bare)
            if price is not None:
                return price
            logger.debug(f"NSE failed for {yf_symbol}, trying yfinance...")
        # Fallback (also primary for BSE/others)
        return self._fetch_yfinance(yf_symbol)

    # ── Bulk Refresh ───────────────────────────────────────────────────────────

    def _refresh_all(self):
        """Fetch prices for every tracked symbol and update the cache."""
        # Dynamically reload symbols from DB to pick up any additions/removals
        try:
            from utils.db import db_get_all_yf_symbols
            db_symbols = db_get_all_yf_symbols()
            if db_symbols:
                self._symbols = db_symbols
        except Exception as e:
            logger.error(f"Failed to refresh symbols from database: {e}")

        if not self._symbols:
            return

        new_prices: dict[str, float] = {}
        for sym in self._symbols:
            price = self._fetch_price(sym)
            if price is not None:
                new_prices[sym] = price
            else:
                # Keep last known price rather than removing it
                cached = self._cache.get(sym)
                if cached is not None:
                    new_prices[sym] = cached
                    logger.warning(f"Using stale cache price for {sym}: ₹{cached}")
                else:
                    logger.warning(f"No price available for {sym} — skipping.")

        with self._lock:
            self._cache.update(new_prices)
            self._last_refreshed = datetime.now(IST)

        logger.info(
            f"Price cache refreshed: {len(new_prices)} symbols | "
            f"{self._last_refreshed.strftime('%H:%M:%S IST')}"
        )

    # ── Background Thread ──────────────────────────────────────────────────────

    def _run(self):
        """Main loop — refreshes prices, sleeps based on market status."""
        logger.info("PriceFetcher background thread started.")
        while not self._stop_event.is_set():
            try:
                self._refresh_all()
            except Exception as e:
                logger.error(f"PriceFetcher refresh error: {e}")

            interval = (
                REFRESH_INTERVAL_OPEN
                if self.is_market_open()
                else REFRESH_INTERVAL_CLOSED
            )
            self._stop_event.wait(timeout=interval)

        logger.info("PriceFetcher background thread stopped.")

    # ── Public API ─────────────────────────────────────────────────────────────

    def start(self, symbols: list[str]):
        """
        Start the background refresh thread.
        symbols: list of yfinance-style symbols, e.g. ["RELIANCE.NS", "TCS.NS"]
        Call once at application startup.
        """
        self._symbols = list(symbols)
        logger.info(f"PriceFetcher starting for {len(symbols)} symbols: {symbols}")

        # Initial blocking fetch so cache is warm before first API request
        self._refresh_all()

        # Start background thread (daemon so it dies with the process)
        self._thread = threading.Thread(target=self._run, daemon=True, name="PriceFetcher")
        self._thread.start()

    def stop(self):
        """Gracefully stop the background thread."""
        self._stop_event.set()

    def update_symbols(self, symbols: list[str]):
        """Hot-reload the symbol list (e.g. after user adds a new stock)."""
        with self._lock:
            self._symbols = list(symbols)
        logger.info(f"PriceFetcher symbols updated: {symbols}")
        # Immediate refresh to populate new symbols
        threading.Thread(target=self._refresh_all, daemon=True).start()

    def get_price(self, yf_symbol: str) -> float | None:
        """
        Return cached price for a symbol.
        Falls back to a live fetch if symbol is not in cache yet.
        """
        with self._lock:
            if yf_symbol in self._cache:
                return self._cache[yf_symbol]

        # Not in cache yet — live fetch (first-time or unknown symbol)
        logger.debug(f"Cache miss for {yf_symbol} — fetching live.")
        price = self._fetch_price(yf_symbol)
        if price is not None:
            with self._lock:
                self._cache[yf_symbol] = price
        return price

    def get_all_prices(self) -> dict[str, float]:
        """Return a snapshot of the full price cache."""
        with self._lock:
            return dict(self._cache)

    def get_last_refreshed(self) -> datetime | None:
        """Return the timestamp of the last successful cache refresh."""
        return self._last_refreshed


# ─── Module-level singleton ────────────────────────────────────────────────────
# Import this everywhere: `from utils.price_fetcher import price_fetcher`
price_fetcher = PriceFetcher()
