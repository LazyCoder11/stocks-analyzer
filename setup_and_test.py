"""
🔧 Setup & Connection Tester
Run this FIRST before using the main analyzer.
Tests all connections: Telegram, Google Sheets, OpenRouter, Yahoo Finance.

Usage:
    python setup_and_test.py
"""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_imports():
    print("1️⃣  Checking Python dependencies...")
    missing = []
    packages = {
        "requests":   "requests",
        "yfinance":   "yfinance",
        "gspread":    "gspread",
        "google.oauth2": "google-auth",
        "feedparser": "feedparser",
        "pandas":     "pandas",
    }
    for module, pip_name in packages.items():
        try:
            __import__(module)
            print(f"   ✅ {pip_name}")
        except ImportError:
            print(f"   ❌ {pip_name} — MISSING")
            missing.append(pip_name)

    if missing:
        print(f"\n   ⚠️  Install missing packages:")
        print(f"   pip install {' '.join(missing)}\n")
        return False
    print("   All packages installed!\n")
    return True


def test_config():
    print("2️⃣  Checking configuration...")
    from config.settings import (
        OPENROUTER_API_KEY, TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID, GOOGLE_SHEETS_ID
    )
    from utils.portfolio import _get_active_sources
    active_sources = _get_active_sources()
    ok = True
    checks = {
        "OPENROUTER_API_KEY": OPENROUTER_API_KEY,
        "TELEGRAM_BOT_TOKEN": TELEGRAM_BOT_TOKEN,
        "TELEGRAM_CHAT_ID":   TELEGRAM_CHAT_ID,
    }
    if "sheets" in active_sources:
        checks["GOOGLE_SHEETS_ID"] = GOOGLE_SHEETS_ID

    for key, val in checks.items():
        if "your_" in val.lower() or not val:
            print(f"   ❌ {key} — Not set in config/settings.py or .env")
            ok = False
        else:
            print(f"   ✅ {key} — Set")
    print()
    return ok


def test_telegram():
    print("3️⃣  Testing Telegram connection...")
    from utils.telegram import test_telegram_connection
    if test_telegram_connection():
        print("   ✅ Telegram works! Check your Telegram for a test message.\n")
        return True
    else:
        print("   ❌ Telegram FAILED. Check BOT_TOKEN and CHAT_ID.\n")
        return False


def test_openrouter():
    print("4️⃣  Testing OpenRouter API...")
    import requests
    from config.settings import OPENROUTER_API_KEY
    try:
        r = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "anthropic/claude-sonnet-4-5",
                "messages": [{"role": "user", "content": "Say: OpenRouter connected!"}],
                "max_tokens": 20
            },
            timeout=30
        )
        if r.status_code == 200:
            reply = r.json()["choices"][0]["message"]["content"]
            print(f"   ✅ OpenRouter works! Response: {reply}\n")
            return True
        else:
            print(f"   ❌ OpenRouter error {r.status_code}: {r.text[:200]}\n")
            return False
    except Exception as e:
        print(f"   ❌ OpenRouter exception: {e}\n")
        return False


def test_google_sheets():
    print("5️⃣  Testing Google Sheets connection...")
    try:
        from utils.sheets import fetch_portfolio_from_sheets
        portfolio = fetch_portfolio_from_sheets()
        print(f"   ✅ Google Sheets works! Found {len(portfolio)} stocks:")
        for s in portfolio:
            print(f"      • {s['symbol']}: {s['quantity']} units @ ₹{s['buy_price']}")
        print()
        return True
    except Exception as e:
        print(f"   ❌ Google Sheets FAILED: {e}\n")
        return False

def test_local_portfolio():
    print("5️⃣  Testing Local Portfolio connection...")
    try:
        from utils.portfolio import LOCAL_PORTFOLIO_FILE
        import json
        if not LOCAL_PORTFOLIO_FILE.exists():
            print("   ⚠️  data/portfolio.json does not exist. (It will be created when you add stocks in the Web UI)\n")
            return True
        content = LOCAL_PORTFOLIO_FILE.read_text(encoding="utf-8")
        portfolio = json.loads(content)
        print(f"   ✅ Local portfolio file parsed successfully! Found {len(portfolio)} stocks:")
        for s in portfolio:
            print(f"      • {s.get('symbol', 'Unknown')}: {s.get('quantity', 0)} units @ ₹{s.get('buy_price', 0)}")
        print()
        return True
    except Exception as e:
        print(f"   ❌ Local portfolio FAILED to parse: {e}\n")
        return False


def test_market_data():
    print("6️⃣  Testing live market data (Yahoo Finance)...")
    from utils.market import get_technical_data
    test_stocks = ["RELIANCE", "TCS"]
    for sym in test_stocks:
        try:
            data = get_technical_data(sym)
            print(f"   ✅ {sym}: ₹{data.get('live_price', 'N/A')} | RSI: {data.get('rsi', 'N/A')} | Trend: {data.get('trend', 'N/A')}")
        except Exception as e:
            print(f"   ⚠️  {sym}: {e}")
    print()
    return True


def run_sample_analysis():
    print("7️⃣  Running SAMPLE analysis (no real Google Sheets or local data needed)...")
    print("   This will use sample portfolio data and send a real message to Telegram...")
    
    # Patch to use sample data
    import utils.sheets as sheets_mod
    import utils.portfolio as portfolio_mod
    sheets_mod.fetch_portfolio_from_sheets = sheets_mod.fetch_sample_portfolio
    portfolio_mod.fetch_combined_portfolio = sheets_mod.fetch_sample_portfolio
    
    from analyzer import run_analysis
    try:
        run_analysis("morning")
        print("   ✅ Sample analysis sent to Telegram!\n")
        return True
    except Exception as e:
        print(f"   ❌ Analysis failed: {e}\n")
        return False


if __name__ == "__main__":
    print("\n" + "═" * 50)
    print("   📊 STOCK ANALYZER SETUP TEST")
    print("═" * 50 + "\n")

    results = {}
    results["imports"]    = test_imports()
    results["config"]     = test_config()

    if not results["imports"] or not results["config"]:
        print("⚠️  Fix the above issues before continuing.\n")
        sys.exit(1)

    results["telegram"]   = test_telegram()
    results["openrouter"] = test_openrouter()

    from utils.portfolio import _get_active_sources
    active_sources = _get_active_sources()
    
    if "sheets" in active_sources:
        results["sheets"] = test_google_sheets()
    if "local" in active_sources:
        results["local_portfolio"] = test_local_portfolio()

    results["market"]     = test_market_data()

    print("═" * 50)
    print("   SUMMARY")
    print("═" * 50)
    all_ok = all(results.values())
    for name, ok in results.items():
        icon = "✅" if ok else "❌"
        pretty_name = name.replace("_", " ").capitalize()
        print(f"   {icon} {pretty_name}")

    if all_ok:
        print("\n🎉 Everything is working!")
        print("\nRun a sample analysis to Telegram?")
        choice = input("Type 'yes' to run a sample analysis: ").strip().lower()
        if choice == "yes":
            run_sample_analysis()
        print("\n▶️  To start the scheduler (runs 8:30 AM + 6 PM IST daily):")
        print("   python analyzer.py\n")
        print("▶️  To run a manual analysis right now:")
        print("   python analyzer.py morning\n")
    else:
        print("\n⚠️  Fix the failed checks above, then re-run this script.")
    print()
