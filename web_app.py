"""
🖥️  Stock Analyzer Web App
Manage your portfolio through a browser UI.
Run: python web_app.py  →  open http://localhost:5000
"""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import os
import uuid
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=os.path.join(BASE_DIR, "static"), static_url_path="")

from utils.db import db_load_portfolio as load_portfolio, db_save_portfolio as save_portfolio


# ─── Static / Frontend ────────────────────────────────────────────────────────

@app.route("/")
def index():
    return app.send_static_file("index.html")


# ─── Portfolio API ────────────────────────────────────────────────────────────

@app.route("/api/portfolio", methods=["GET"])
def get_portfolio():
    """Return all holdings with live prices."""
    portfolio = load_portfolio()

    # Enrich with live price in background (fast_info only)
    enriched = []
    for stock in portfolio:
        item = stock.copy()
        try:
            import yfinance as yf
            sym = stock["yf_symbol"]
            ticker = yf.Ticker(sym)
            fi = ticker.fast_info
            live = round(fi.last_price or fi.previous_close or stock["buy_price"], 2)
            item["live_price"] = live
            item["pnl"] = round((live - stock["buy_price"]) * stock["quantity"], 2)
            item["pnl_pct"] = round(((live - stock["buy_price"]) / stock["buy_price"]) * 100, 2) if stock["buy_price"] else 0
        except Exception:
            item["live_price"] = stock.get("buy_price", 0)
            item["pnl"] = 0
            item["pnl_pct"] = 0
        enriched.append(item)

    return jsonify(enriched)


@app.route("/api/portfolio", methods=["POST"])
def add_stock():
    """Add a new stock to the portfolio."""
    data = request.get_json()
    required = ["symbol", "quantity", "buy_price", "exchange"]
    for field in required:
        if field not in data or data[field] == "" or data[field] is None:
            return jsonify({"error": f"'{field}' is required"}), 400

    portfolio = load_portfolio()

    symbol   = str(data["symbol"]).strip().upper()
    exchange = str(data.get("exchange", "NSE")).strip().upper()
    yf_sym   = f"{symbol}.NS" if exchange == "NSE" else f"{symbol}.BO"

    # Check duplicate
    for s in portfolio:
        if s["symbol"] == symbol:
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
    return jsonify(entry), 201


@app.route("/api/portfolio/<stock_id>", methods=["PUT"])
def update_stock(stock_id):
    """Update an existing stock."""
    data = request.get_json()
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
            return jsonify(portfolio[i])

    return jsonify({"error": "Stock not found"}), 404


@app.route("/api/portfolio/<stock_id>", methods=["DELETE"])
def delete_stock(stock_id):
    """Remove a stock from the portfolio."""
    portfolio = load_portfolio()
    updated = [s for s in portfolio if s["id"] != stock_id]
    if len(updated) == len(portfolio):
        return jsonify({"error": "Stock not found"}), 404
    save_portfolio(updated)
    return jsonify({"ok": True})


@app.route("/api/lookup/<symbol>")
def lookup_symbol(symbol):
    """Quick lookup — validate a symbol and return company name + live price."""
    exchange = request.args.get("exchange", "NSE").upper()
    yf_sym   = f"{symbol.upper()}.NS" if exchange == "NSE" else f"{symbol.upper()}.BO"
    
    # Default fallback values
    name = symbol.upper()
    live = 0.0
    sector = "Other"
    
    try:
        import yfinance as yf
        ticker = yf.Ticker(yf_sym)
        
        # 1. Try to get live price from fast_info (often works on cloud IPs)
        try:
            fi = ticker.fast_info
            live = fi.last_price or fi.previous_close or 0
        except Exception:
            # Fallback to history close price
            try:
                hist = ticker.history(period="1d")
                if not hist.empty:
                    live = hist['Close'].iloc[-1]
            except Exception:
                pass

        # 2. Try to get company name and sector from info (full scrape, often blocked on cloud IPs)
        try:
            info = ticker.info
            if info:
                name = info.get("longName") or info.get("shortName") or name
                sector = info.get("sector") or sector
        except Exception:
            # Silently pass, we will use default symbol and "Other" sector
            pass

        return jsonify({
            "valid":        True,
            "symbol":       symbol.upper(),
            "company_name": name,
            "live_price":   round(live, 2) if live else 0.0,
            "sector":       sector,
        })
    except Exception as e:
        return jsonify({"valid": False, "error": str(e)}), 400


@app.route("/api/news")
def get_stock_news():
    """Fetch news for stock symbols."""
    symbols_str = request.args.get("symbols", "")
    if not symbols_str:
        return jsonify([])

    yf_symbols = [s.strip() for s in symbols_str.split(",") if s.strip()]
    if not yf_symbols:
        return jsonify([])

    import yfinance as yf
    from concurrent.futures import ThreadPoolExecutor

    # Limit to maximum 5 symbols to avoid slow response / rate limits
    yf_symbols = yf_symbols[:5]

    def parse_article(raw_article, sym):
        # Format adapter: handles both old flat and new nested structures
        content = raw_article.get("content", {}) if "content" in raw_article else raw_article
        
        # Title
        title = content.get("title") or raw_article.get("title") or ""
        
        # Link
        link = ""
        canonical = content.get("canonicalUrl", {})
        if isinstance(canonical, dict):
            link = canonical.get("url")
        if not link:
            clickthrough = content.get("clickThroughUrl", {})
            if isinstance(clickthrough, dict):
                link = clickthrough.get("url")
        if not link:
            link = content.get("link") or raw_article.get("link") or ""
            
        # Publisher
        publisher = ""
        provider = content.get("provider", {})
        if isinstance(provider, dict):
            publisher = provider.get("displayName")
        if not publisher:
            publisher = raw_article.get("publisher") or "Yahoo Finance"
            
        # Publish Time
        pub_time = 0
        pub_date_str = content.get("pubDate") or raw_article.get("pubDate")
        if pub_date_str:
            try:
                from datetime import datetime
                # Parse ISO date string (e.g. "2026-06-22T05:09:16Z")
                # Remove Z and parse
                dt = datetime.strptime(pub_date_str.replace("Z", ""), "%Y-%m-%dT%H:%M:%S")
                pub_time = int(dt.timestamp())
            except Exception:
                pass
        if not pub_time:
            pub_time = content.get("providerPublishTime") or raw_article.get("providerPublishTime") or 0
            
        return {
            "title": title,
            "link": link,
            "publisher": publisher,
            "providerPublishTime": int(pub_time),
            "yf_symbol": sym
        }

    def fetch_single(sym):
        try:
            ticker = yf.Ticker(sym)
            news = ticker.news or []
            parsed = [parse_article(art, sym) for art in news]
            return parsed
        except Exception:
            return []

    all_news = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = executor.map(fetch_single, yf_symbols)
        for r in results:
            all_news.extend(r)

    # Sort all news by publish time descending
    all_news.sort(key=lambda x: x.get("providerPublishTime", 0), reverse=True)

    # De-duplicate by title or link
    seen_links = set()
    unique_news = []
    for article in all_news:
        link = article.get("link")
        if link and link not in seen_links:
            seen_links.add(link)
            unique_news.append(article)

    # Return top 15 articles
    return jsonify(unique_news[:15])


@app.route("/api/run-analysis", methods=["POST"])
def run_analysis_now():
    """Trigger the analyzer manually from the UI."""
    data = request.get_json() or {}
    session = data.get("session", "morning")
    user_id = data.get("user_id")
    chat_id = data.get("chat_id")
    try:
        # Make sure analyzer uses local portfolio
        os.environ["PORTFOLIO_SOURCES"] = "local"
        from analyzer import run_analysis
        import threading
        t = threading.Thread(target=run_analysis, args=(session, user_id, chat_id), daemon=True)
        t.start()
        return jsonify({"ok": True, "message": f"{session.capitalize()} analysis started — check Telegram!"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


if __name__ == "__main__":
    print("\n" + "═" * 50)
    print("  📊 Stock Analyzer Portfolio Manager")
    print("═" * 50)
    print("  ➜  Open in browser: http://localhost:5000")
    print("  ➜  Press Ctrl+C to stop\n")
    app.run(debug=False, port=5000, host="0.0.0.0")
