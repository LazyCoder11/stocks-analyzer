"""
🖥️  Stock Analyzer — Flask API Server
======================================
Serves the Next.js frontend via a set of authenticated REST endpoints.

Endpoints
---------
  GET  /api/portfolio          → Holdings enriched with live prices (from cache)
  POST /api/portfolio          → Add a new stock
  PUT  /api/portfolio/<id>     → Update a stock
  DEL  /api/portfolio/<id>     → Delete a stock
  GET  /api/lookup/<symbol>    → Validate symbol, return name + live price
  GET  /api/prices             → Full price cache snapshot (for frontend polling)
  GET  /api/news               → Latest news for portfolio symbols
  POST /api/run-analysis       → Trigger AI analysis → Telegram

Run locally:  python web_app.py  →  http://localhost:5000
Production:   gunicorn is configured via render.yaml
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import os
import uuid
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from flask import Flask, jsonify, request
from concurrent.futures import ThreadPoolExecutor

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from utils.db import db_load_portfolio as load_portfolio, db_save_portfolio as save_portfolio
from utils.price_fetcher import price_fetcher

# ─── App Setup ─────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IST = ZoneInfo("Asia/Kolkata")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)


# ─── Bootstrap: warm up price cache on startup ─────────────────────────────────

def _get_all_yf_symbols() -> list[str]:
    """Collect every yf_symbol across all users in the DB."""
    try:
        from utils.db import db_get_all_yf_symbols
        return db_get_all_yf_symbols()
    except Exception as e:
        logger.warning(f"Could not pre-load symbols from DB: {e}")
        return []


def _bootstrap_price_fetcher():
    """Start the background price engine once the server is up."""
    symbols = _get_all_yf_symbols()
    if symbols:
        logger.info(f"Starting PriceFetcher with {len(symbols)} symbols.")
        price_fetcher.start(symbols)
    else:
        logger.warning("No symbols found in DB — PriceFetcher will start empty.")
        price_fetcher.start([])


_bootstrap_price_fetcher()


# ─── Portfolio API ─────────────────────────────────────────────────────────────

@app.route("/api/portfolio", methods=["GET"])
def get_portfolio():
    """Return all holdings enriched with live prices (served from cache)."""
    portfolio = load_portfolio()
    all_prices = price_fetcher.get_all_prices()

    enriched = []
    for stock in portfolio:
        item = stock.copy()
        sym  = stock["yf_symbol"]
        live = all_prices.get(sym) or price_fetcher.get_price(sym) or stock["buy_price"]
        live = round(live, 2)

        item["live_price"] = live
        item["pnl"]        = round((live - stock["buy_price"]) * stock["quantity"], 2)
        item["pnl_pct"]    = (
            round(((live - stock["buy_price"]) / stock["buy_price"]) * 100, 2)
            if stock["buy_price"] else 0
        )
        enriched.append(item)

    return jsonify(enriched)


@app.route("/api/portfolio", methods=["POST"])
def add_stock():
    """Add a new stock to the portfolio."""
    data = request.get_json()
    required = ["symbol", "quantity", "buy_price", "exchange"]
    for field in required:
        if not data.get(field) and data.get(field) != 0:
            return jsonify({"error": f"'{field}' is required"}), 400

    portfolio = load_portfolio()
    symbol    = str(data["symbol"]).strip().upper()
    exchange  = str(data.get("exchange", "NSE")).strip().upper()
    yf_sym    = f"{symbol}.NS" if exchange == "NSE" else f"{symbol}.BO"

    if any(s["symbol"] == symbol for s in portfolio):
        return jsonify({"error": f"{symbol} already exists. Use Edit to update it."}), 409

    entry = {
        "id":           str(uuid.uuid4()),
        "symbol":       symbol,
        "yf_symbol":    yf_sym,
        "company_name": str(data.get("company_name", symbol)).strip() or symbol,
        "quantity":     float(data["quantity"]),
        "buy_price":    float(data["buy_price"]),
        "exchange":     exchange,
        "sector":       str(data.get("sector", "")).strip(),
        "notes":        str(data.get("notes", "")).strip(),
    }
    portfolio.append(entry)
    save_portfolio(portfolio)

    # Hot-add the new symbol to the price cache
    price_fetcher.update_symbols(_get_all_yf_symbols())

    return jsonify(entry), 201


@app.route("/api/portfolio/<stock_id>", methods=["PUT"])
def update_stock(stock_id):
    """Update an existing stock."""
    data      = request.get_json()
    portfolio = load_portfolio()

    for i, s in enumerate(portfolio):
        if s["id"] == stock_id:
            symbol   = str(data.get("symbol", s["symbol"])).strip().upper()
            exchange = str(data.get("exchange", s["exchange"])).strip().upper()
            portfolio[i] = {
                **s,
                "symbol":       symbol,
                "yf_symbol":    f"{symbol}.NS" if exchange == "NSE" else f"{symbol}.BO",
                "company_name": str(data.get("company_name", s["company_name"])).strip(),
                "quantity":     float(data.get("quantity", s["quantity"])),
                "buy_price":    float(data.get("buy_price", s["buy_price"])),
                "exchange":     exchange,
                "sector":       str(data.get("sector", s["sector"])).strip(),
                "notes":        str(data.get("notes", s["notes"])).strip(),
            }
            save_portfolio(portfolio)
            price_fetcher.update_symbols(_get_all_yf_symbols())
            return jsonify(portfolio[i])

    return jsonify({"error": "Stock not found"}), 404


@app.route("/api/portfolio/<stock_id>", methods=["DELETE"])
def delete_stock(stock_id):
    """Remove a stock from the portfolio."""
    portfolio = load_portfolio()
    updated   = [s for s in portfolio if s["id"] != stock_id]
    if len(updated) == len(portfolio):
        return jsonify({"error": "Stock not found"}), 404
    save_portfolio(updated)
    price_fetcher.update_symbols(_get_all_yf_symbols())
    return jsonify({"ok": True})


# ─── Live Prices Endpoint ──────────────────────────────────────────────────────

@app.route("/api/prices", methods=["GET"])
def get_prices():
    """
    Return the full price cache snapshot.
    Frontend polls this every 30s to refresh displayed prices.
    """
    last_refreshed = price_fetcher.get_last_refreshed()
    return jsonify({
        "market_open":    price_fetcher.is_market_open(),
        "last_refreshed": last_refreshed.isoformat() if last_refreshed else None,
        "prices":         price_fetcher.get_all_prices(),
    })


# ─── Symbol Lookup ─────────────────────────────────────────────────────────────

@app.route("/api/lookup/<symbol>")
def lookup_symbol(symbol):
    """Validate a symbol and return company name + live price."""
    import yfinance as yf

    exchange = request.args.get("exchange", "NSE").upper()
    yf_sym   = f"{symbol.upper()}.NS" if exchange == "NSE" else f"{symbol.upper()}.BO"

    name   = symbol.upper()
    live   = price_fetcher.get_price(yf_sym) or 0.0
    sector = "Other"

    try:
        from utils.price_fetcher import get_proxied_session
        session = get_proxied_session()
        ticker = yf.Ticker(yf_sym, session=session)
        try:
            info   = ticker.info or {}
            name   = info.get("longName") or info.get("shortName") or name
            sector = info.get("sector") or sector
        except Exception:
            pass

        # If price_fetcher had no cache for this symbol, try yfinance
        if not live:
            try:
                fi   = ticker.fast_info
                live = round(fi.last_price or fi.previous_close or 0, 2)
            except Exception:
                pass

        return jsonify({
            "valid":        True,
            "symbol":       symbol.upper(),
            "company_name": name,
            "live_price":   round(live, 2),
            "sector":       sector,
        })
    except Exception as e:
        return jsonify({"valid": False, "error": str(e)}), 400


# ─── News ──────────────────────────────────────────────────────────────────────

@app.route("/api/news")
def get_stock_news():
    """Fetch latest news for comma-separated yf_symbol list."""
    import yfinance as yf

    symbols_str = request.args.get("symbols", "")
    if not symbols_str:
        return jsonify([])

    yf_symbols = [s.strip() for s in symbols_str.split(",") if s.strip()][:5]

    def parse_article(raw: dict, sym: str) -> dict | None:
        content   = raw.get("content", raw) if "content" in raw else raw
        title     = content.get("title") or raw.get("title") or ""
        if not title:
            return None

        link = ""
        for key in ("canonicalUrl", "clickThroughUrl"):
            obj = content.get(key, {})
            if isinstance(obj, dict):
                link = obj.get("url", "")
            if link:
                break
        if not link:
            link = content.get("link") or raw.get("link") or ""

        publisher = ""
        provider  = content.get("provider", {})
        if isinstance(provider, dict):
            publisher = provider.get("displayName", "")
        publisher = publisher or raw.get("publisher") or "Yahoo Finance"

        pub_time = 0
        pub_str  = content.get("pubDate") or raw.get("pubDate")
        if pub_str:
            try:
                from datetime import datetime as dt
                pub_time = int(dt.strptime(pub_str.replace("Z", ""), "%Y-%m-%dT%H:%M:%S").timestamp())
            except Exception:
                pass
        if not pub_time:
            pub_time = content.get("providerPublishTime") or raw.get("providerPublishTime") or 0

        return {"title": title, "link": link, "publisher": publisher,
                "providerPublishTime": int(pub_time), "yf_symbol": sym}

    def fetch_single(sym: str) -> list:
        try:
            return [
                a for a in (parse_article(r, sym) for r in (yf.Ticker(sym).news or []))
                if a is not None
            ]
        except Exception:
            return []

    all_news: list = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        for batch in pool.map(fetch_single, yf_symbols):
            all_news.extend(batch)

    all_news.sort(key=lambda x: x.get("providerPublishTime", 0), reverse=True)

    seen, unique = set(), []
    for article in all_news:
        link = article.get("link")
        if link and link not in seen:
            seen.add(link)
            unique.append(article)

    return jsonify(unique[:15])


# ─── AI Analysis Trigger ───────────────────────────────────────────────────────

@app.route("/api/run-analysis", methods=["POST"])
def run_analysis_now():
    """Trigger the AI analysis pipeline → sends report to Telegram."""
    import threading
    data     = request.get_json() or {}
    session  = data.get("session", "morning")
    user_id  = data.get("user_id")
    chat_id  = data.get("chat_id")
    try:
        os.environ["PORTFOLIO_SOURCES"] = "local"
        from analyzer import run_analysis
        t = threading.Thread(
            target=run_analysis, args=(session, user_id, chat_id), daemon=True
        )
        t.start()
        return jsonify({"ok": True, "message": f"{session.capitalize()} analysis started — check Telegram!"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ─── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "═" * 52)
    print("  📊  Stock Analyzer — API Server")
    print("═" * 52)
    print("  ➜  Local:   http://localhost:5000")
    print("  ➜  Prices:  http://localhost:5000/api/prices")
    print("  ➜  Press Ctrl+C to stop\n")
    app.run(debug=False, port=5000, host="0.0.0.0")
