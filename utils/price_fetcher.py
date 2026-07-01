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

import json
import os

CACHE_FILE = "data/prices_cache.json"

def _save_cache_to_file(cache: dict, last_refreshed: datetime | None):
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        data = {
            "prices": cache,
            "last_refreshed": last_refreshed.isoformat() if last_refreshed else None
        }
        with open(CACHE_FILE, "w") as f:
            json.dump(data, f)
    except Exception as e:
        logger.error(f"Failed to write price cache file: {e}")

def _load_cache_from_file() -> tuple[dict[str, float], datetime | None]:
    if not os.path.exists(CACHE_FILE):
        return {}, None
    try:
        with open(CACHE_FILE, "r") as f:
            data = json.load(f)
            prices = data.get("prices", {})
            lr_str = data.get("last_refreshed")
            try:
                last_refreshed = datetime.fromisoformat(lr_str) if lr_str else None
            except Exception:
                last_refreshed = None
            return prices, last_refreshed
    except Exception as e:
        logger.error(f"Failed to read price cache file: {e}")
        return {}, None

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


def get_proxied_session() -> requests.Session:
    """Create a requests.Session configured with proxies if environment variables are set."""
    import os
    session = requests.Session()
    proxy_url = os.environ.get("PROXY_URL") or os.environ.get("HTTP_PROXY") or os.environ.get("HTTPS_PROXY")
    if proxy_url:
        session.proxies = {
            "http": proxy_url,
            "https": proxy_url
        }
    return session


# ─── Price Fetcher ─────────────────────────────────────────────────────────────

class PriceFetcher:
    """
    Singleton price engine.
    Maintains an NSE session and a background refresh thread.
    """

    def __init__(self):
        prices, lr = _load_cache_from_file()
        self._cache: dict[str, float] = prices   # { "RELIANCE.NS": 1316.50 }
        self._symbols: list[str] = []            # yf-style symbols
        self._last_refreshed: datetime | None = lr
        self._nse_disabled_until: float = 0.0    # circuit-breaker timestamp
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._session: requests.Session = self._make_session()

    # ── Session Management ─────────────────────────────────────────────────────

    def _make_session(self) -> requests.Session:
        """Create a persistent requests.Session with NSE cookies pre-loaded."""
        session = get_proxied_session()
        session.headers.update(NSE_HEADERS)
        
        # Log if proxy is active
        if session.proxies:
            logger.info(f"PriceFetcher session proxy active: {session.proxies.get('http')}")
        try:
            # Visit homepage to set session cookies (NSE requires this)
            resp = session.get(NSE_HOME_URL, timeout=8)
            if resp.status_code != 200:
                logger.warning(f"NSE homepage returned status {resp.status_code} — API is likely blocked.")
            else:
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
        import time
        if time.time() < self._nse_disabled_until:
            return None

        url = NSE_QUOTE_URL.format(symbol=symbol.upper())
        try:
            resp = self._session.get(url, timeout=6)
            if resp.status_code in (401, 403):
                logger.warning("NSE session expired or blocked — refreshing cookies.")
                self._refresh_session()
                resp = self._session.get(url, timeout=6)
                if resp.status_code in (401, 403):
                    logger.warning("NSE API still blocked. Activating 10-minute circuit breaker.")
                    self._nse_disabled_until = time.time() + 600
                    return None

            if resp.status_code == 200:
                data = resp.json()
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
            fi = yf.Ticker(yf_symbol, session=self._session).fast_info
            price = fi.last_price or fi.previous_close
            return round(float(price), 2) if price else None
        except Exception as e:
            logger.debug(f"yfinance fetch failed for {yf_symbol}: {e}")
            return None

    def _fetch_twelvedata_batch(self, yf_symbols: list[str], api_key: str) -> dict[str, float]:
        """Fetch prices for multiple symbols in a single Twelve Data API call."""
        prices: dict[str, float] = {}
        if not yf_symbols:
            return prices

        # Map yfinance symbols to Twelve Data format
        td_to_yf: dict[str, str] = {}
        td_symbols_list: list[str] = []
        for sym in yf_symbols:
            td_sym = sym
            if sym.endswith(".NS"):
                td_sym = f"{sym[:-3]}:XNSE"
            elif sym.endswith(".BO"):
                td_sym = f"{sym[:-3]}:XBOM"
            
            td_to_yf[td_sym] = sym
            td_symbols_list.append(td_sym)

        # Build url
        symbols_str = ",".join(td_symbols_list)
        url = f"https://api.twelvedata.com/price?symbol={symbols_str}&apikey={api_key}"

        try:
            resp = self._session.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                
                # Check for API error structure
                if isinstance(data, dict) and data.get("status") == "error":
                    logger.error(f"Twelve Data API error: {data.get('message')}")
                    return prices

                # If only one symbol was requested, response might be a flat dict
                if len(td_symbols_list) == 1:
                    if isinstance(data, dict) and "price" in data:
                        try:
                            prices[yf_symbols[0]] = round(float(data["price"]), 2)
                        except (ValueError, TypeError):
                            pass
                else:
                    # Batch response is a dict of {td_symbol: {price: val}}
                    if isinstance(data, dict):
                        for td_sym, price_data in data.items():
                            yf_sym = td_to_yf.get(td_sym)
                            if not yf_sym:
                                # Fallback key matching (e.g. key is just base symbol like 'TCS')
                                base_sym = td_sym.split(":")[0]
                                for yf_s in yf_symbols:
                                    if yf_s.startswith(base_sym + "."):
                                        yf_sym = yf_s
                                        break
                            
                            if yf_sym and isinstance(price_data, dict) and "price" in price_data:
                                try:
                                    prices[yf_sym] = round(float(price_data["price"]), 2)
                                except (ValueError, TypeError):
                                    pass
            else:
                logger.error(f"Twelve Data request failed: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"Twelve Data fetch exception: {e}")

        return prices

    def _fetch_price(self, yf_symbol: str) -> float | None:
        """
        Fetch a single price.
        Strategy:
          • .NS  → try NSE API first, yfinance fallback
          • .BO  → yfinance only (BSE not supported by NSE equity API)
          • Other (indices, ETFs) → yfinance only
        """
        import time
        if yf_symbol.endswith(".NS") and time.time() > self._nse_disabled_until:
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
        failed_symbols: list[str] = []
        for sym in self._symbols:
            price = self._fetch_price(sym)
            if price is not None:
                new_prices[sym] = price
            else:
                failed_symbols.append(sym)

        # Call Twelve Data for failed symbols as a fallback
        if failed_symbols:
            import os
            td_api_key = os.environ.get("TWELVEDATA_API_KEY")
            if td_api_key:
                logger.info(f"Attempting Twelve Data fallback for {len(failed_symbols)} symbols: {failed_symbols}")
                td_prices = self._fetch_twelvedata_batch(failed_symbols, td_api_key)
                new_prices.update(td_prices)
                
                # Remove successfully fetched symbols from failed_symbols list
                for sym in list(failed_symbols):
                    if sym in td_prices:
                        failed_symbols.remove(sym)
            else:
                logger.warning("Twelve Data API key not configured — fallback skipped.")

        # Keep last known price for remaining failed symbols
        for sym in failed_symbols:
            cached = self._cache.get(sym)
            if cached is not None:
                new_prices[sym] = cached
                logger.warning(f"Using stale cache price for {sym}: ₹{cached}")
            else:
                logger.warning(f"No price available for {sym} — skipping.")

        with self._lock:
            self._cache.update(new_prices)
            self._last_refreshed = datetime.now(IST)
            _save_cache_to_file(self._cache, self._last_refreshed)

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
        # Read from file cache first
        prices, _ = _load_cache_from_file()
        if yf_symbol in prices:
            return prices[yf_symbol]

        with self._lock:
            if yf_symbol in self._cache:
                return self._cache[yf_symbol]

        # Not in cache yet — live fetch (first-time or unknown symbol)
        logger.debug(f"Cache miss for {yf_symbol} — fetching live.")
        price = self._fetch_price(yf_symbol)
        if price is not None:
            with self._lock:
                self._cache[yf_symbol] = price
                _save_cache_to_file(self._cache, self._last_refreshed)
        return price

    def get_all_prices(self) -> dict[str, float]:
        """Return a snapshot of the full price cache."""
        prices, _ = _load_cache_from_file()
        if prices:
            return prices
        with self._lock:
            return dict(self._cache)

    def get_last_refreshed(self) -> datetime | None:
        """Return the timestamp of the last successful cache refresh."""
        _, lr = _load_cache_from_file()
        if lr:
            return lr
        return self._last_refreshed


# ─── Module-level singleton ────────────────────────────────────────────────────
# Import this everywhere: `from utils.price_fetcher import price_fetcher`
price_fetcher = PriceFetcher()
