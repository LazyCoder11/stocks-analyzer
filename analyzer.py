"""
📊 Stock Portfolio Analyzer
Fetches portfolio → Enriches with live prices (NSE API) → Technical analysis
→ AI analysis via OpenRouter → Sends report to Telegram
Runs twice daily: 8:30 AM & 6:00 PM IST via run_scheduler()
"""

import os
import json
import time
import logging
import requests
import yfinance as yf
from datetime import datetime, date
from zoneinfo import ZoneInfo
from config.settings import (
    OPENROUTER_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
    MORNING_HOUR, EVENING_HOUR
)
from utils.portfolio import fetch_combined_portfolio
from utils.news import fetch_stock_news
from utils.telegram import send_telegram_message, send_telegram_photo
from utils.market import get_technical_data
from utils.price_fetcher import price_fetcher
import sys
import codecs
if sys.platform.startswith("win"):
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())


# ─── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    filename='logs/analyzer.log',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ─── OpenRouter Model Fallback Chain ──────────────────────────────────────────
# Primary: Claude 3.5 Sonnet → Fallback: GPT-4o → Gemini 1.5 Pro → Llama 3.1 405B
MODELS = [
    "anthropic/claude-sonnet-4-5",
    "openai/gpt-4o",
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash",
    "meta-llama/llama-3.3-70b-instruct",
    "openrouter/free"
]

IST = ZoneInfo("Asia/Kolkata")

def call_openrouter(system_prompt: str, user_prompt: str) -> str:
    """Call OpenRouter with automatic model fallback."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stock-analyzer-bot",
        "X-Title": "Stock Portfolio Analyzer"
    }

    for model in MODELS:
        try:
            logger.info(f"Trying model: {model}")
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.3,
                },
                timeout=60
            )

            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                used_model = data.get("model", model)
                logger.info(f"✅ Success with model: {used_model}")
                return content, used_model
            elif response.status_code in [429, 503, 529]:
                logger.warning(f"Model {model} unavailable ({response.status_code}), trying next...")
                time.sleep(2)
                continue
            else:
                logger.error(f"Model {model} error: {response.status_code} - {response.text}")
                continue

        except requests.exceptions.Timeout:
            logger.warning(f"Model {model} timed out, trying next...")
            continue
        except Exception as e:
            logger.error(f"Model {model} exception: {e}")
            continue

    raise Exception("❌ All AI models failed. Check your OpenRouter API key and quota.")


def build_analysis_prompt(portfolio: list, news_data: dict, session: str) -> tuple:
    """Build a powerful, context-rich prompt for deep analysis."""

    ist_now = datetime.now(IST)
    date_str = ist_now.strftime("%d %B %Y, %I:%M %p IST")
    session_context = "pre-market morning session" if session == "morning" else "end-of-day evening session"

    # Build portfolio summary with live prices
    portfolio_lines = []
    total_invested = 0
    total_current = 0

    for stock in portfolio:
        symbol = stock["symbol"]
        qty = stock["quantity"]
        buy_price = stock["buy_price"]
        live_price = stock.get("live_price", buy_price)
        pnl = (live_price - buy_price) * qty
        pnl_pct = ((live_price - buy_price) / buy_price) * 100
        invested = buy_price * qty
        current = live_price * qty
        total_invested += invested
        total_current += current

        ma200 = stock.get('ma200')
        ma200_str = f"₹{ma200:.2f}" if ma200 is not None else "N/A"
        portfolio_lines.append(
            f"• {symbol}: Qty={qty} | Buy=₹{buy_price:.2f} | CMP=₹{live_price:.2f} | "
            f"P&L=₹{pnl:+.2f} ({pnl_pct:+.1f}%) | 52W High=₹{stock.get('high_52w','N/A')} | "
            f"52W Low=₹{stock.get('low_52w','N/A')} | RSI={stock.get('rsi','N/A')} | "
            f"MA200={ma200_str} | Trend={stock.get('trend','N/A')} | Sector: {stock.get('sector','N/A')}"
        )

    portfolio_text = "\n".join(portfolio_lines)
    total_pnl = total_current - total_invested
    total_pnl_pct = ((total_current - total_invested) / total_invested) * 100 if total_invested else 0

    # Build news summary per stock
    news_lines = []
    for symbol, articles in news_data.items():
        if articles:
            news_lines.append(f"\n📰 {symbol} News:")
            for i, article in enumerate(articles[:4], 1):
                news_lines.append(f"  {i}. [{article['source']}] {article['title']} - {article['published']}")
                if article.get("summary"):
                    news_lines.append(f"     Summary: {article['summary'][:200]}...")

    news_text = "\n".join(news_lines) if news_lines else "No major news fetched."

    system_prompt = """You are a top-tier Indian stock market analyst. 
Provide a CONCISE, PUNCHY, and highly actionable analysis of the user's portfolio.
Do not write long paragraphs or generic boilerplate text. 
Focus strictly on direct action recommendations (BUY / SELL / HOLD), specific price levels, and news impact.
Use clear bullet points and emojis. Keep the entire response under 500-600 words."""

    user_prompt = f"""
📅 Analysis Date: {date_str}
📊 Session: {session_context.upper()}

💼 PORTFOLIO STATUS:
{portfolio_text}

Total Invested: ₹{total_invested:,.2f} | Current Value: ₹{total_current:,.2f} | P&L: ₹{total_pnl:+,.2f} ({total_pnl_pct:+.1f}%)

📰 LATEST STOCK NEWS:
{news_text}
Provide your analysis EXACTLY in the following format (stay under 600 words):

### 🌍 1. MARKET QUICK LOOK (Max 3 sentences)
- [Expected Nifty/Sensex direction, key global cues, and trading range for today]

### 📋 2. ACTIONS FOR MY STOCKS (Max 2 sentences per stock)
For EACH stock in the portfolio, provide:
* **[SYMBOL]**: [RECOMMENDATION: BUY MORE / HOLD / REDUCE / SELL EXIT] (Target: ₹___ | SL: ₹___ | Horizon: [Short/Medium/Long])
  - **Reason**: [1 clear sentence explaining technical support/resistance or news impact]

### 🎯 3. TODAY'S TACTICAL ACTION PLAN
- [Top 1-2 immediate triggers, buy zones, or stop-loss adjustments to execute today]

### ⚠️ 4. HIGH RISK ALERTS
- [Any critical risk factor, upcoming earnings release, RBI policy decision, or sector warning]"""

    return system_prompt, user_prompt


def format_telegram_message(analysis: str, portfolio: list, session: str, model_used: str) -> list:
    """Split and format analysis into Telegram-friendly chunks."""

    ist_now = datetime.now(IST)
    emoji = "🌅" if session == "morning" else "🌆"
    session_label = "MORNING PRE-MARKET" if session == "morning" else "EVENING END-OF-DAY"

    header = (
        f"{emoji} *{session_label} ANALYSIS*\n"
        f"📅 {ist_now.strftime('%d %b %Y • %I:%M %p IST')}\n"
        f"🤖 _Powered by: {model_used.split('/')[-1]}_\n"
        f"{'━' * 30}\n\n"
    )

    # Calculate quick portfolio summary
    total_invested = sum(s['buy_price'] * s['quantity'] for s in portfolio)
    total_current = sum(s.get('live_price', s['buy_price']) * s['quantity'] for s in portfolio)
    total_pnl = total_current - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested else 0
    pnl_emoji = "📈" if total_pnl >= 0 else "📉"

    portfolio_summary = (
        f"*💼 PORTFOLIO SNAPSHOT*\n"
        f"Invested: ₹{total_invested:,.0f}\n"
        f"Current:  ₹{total_current:,.0f}\n"
        f"{pnl_emoji} P&L: ₹{total_pnl:+,.0f} ({total_pnl_pct:+.1f}%)\n\n"
        f"*Holdings:*\n"
    )

    for s in portfolio:
        live = s.get('live_price', s['buy_price'])
        pnl_pct = ((live - s['buy_price']) / s['buy_price']) * 100
        tick = "🟢" if pnl_pct >= 0 else "🔴"
        portfolio_summary += f"{tick} {s['symbol']}: ₹{live:.1f} ({pnl_pct:+.1f}%)\n"

    full_message = header + portfolio_summary + "\n" + "━" * 30 + "\n\n" + analysis

    # Telegram limit is 4096 chars — split intelligently
    messages = []
    current = ""
    chunks = full_message.split("\n\n")

    for chunk in chunks:
        if len(current) + len(chunk) + 2 < 4000:
            current += chunk + "\n\n"
        else:
            if current:
                messages.append(current.strip())
            current = chunk + "\n\n"

    if current.strip():
        messages.append(current.strip())

    return messages


def run_analysis(session: str = "morning", user_id: str = None, chat_id: str = None):
    """Main analysis pipeline."""
    logger.info(f"🚀 Starting {session} analysis for user {user_id}...")

    try:
        if not chat_id and user_id:
            from utils.db import db_get_user_by_id
            user = db_get_user_by_id(user_id)
            if user:
                chat_id = user.get("telegram_chat_id")

        if not chat_id:
            chat_id = TELEGRAM_CHAT_ID  # Global fallback
            logger.info(f"No custom chat ID found for user {user_id}, using default fallback: {chat_id}")

        # Step 1: Fetch portfolio from configured sources (local / Sheets / Angel One / Groww)
        logger.info(f"📋 Fetching portfolio for user {user_id}...")
        portfolio = fetch_combined_portfolio(user_id)
        if not portfolio:
            raise Exception("Portfolio is empty. Add assets in the web dashboard first.")
        logger.info(f"✅ Loaded {len(portfolio)} stocks: {[s['symbol'] for s in portfolio]}")

        # Step 2: Enrich portfolio with live prices & technicals
        logger.info("💹 Fetching live prices and technical data...")

        # Start price fetcher if not already running (e.g. when called standalone)
        symbols = [s["yf_symbol"] for s in portfolio]
        if not price_fetcher.get_all_prices():
            price_fetcher.start(symbols)

        all_prices = price_fetcher.get_all_prices()

        for stock in portfolio:
            yf_sym = stock.get("yf_symbol", f"{stock['symbol']}.NS")
            live   = all_prices.get(yf_sym) or price_fetcher.get_price(yf_sym) or stock["buy_price"]
            try:
                enriched = get_technical_data(yf_sym, live_price=live)
                stock.update(enriched)
                logger.info(f"  ✅ {stock['symbol']}: ₹{stock.get('live_price', 'N/A')}")
            except Exception as e:
                stock["live_price"] = live
                logger.warning(f"  ⚠️ Could not fetch technical data for {stock['symbol']}: {e}")

        # Step 3: Fetch latest news for each stock
        logger.info("📰 Fetching latest news...")
        news_data = {}
        for stock in portfolio:
            try:
                news_data[stock["symbol"]] = fetch_stock_news(stock["symbol"], stock.get("company_name", ""))
                logger.info(f"  ✅ {stock['symbol']}: {len(news_data[stock['symbol']])} articles")
            except Exception as e:
                logger.warning(f"  ⚠️ No news for {stock['symbol']}: {e}")
                news_data[stock["symbol"]] = []

        # Step 4: Build prompt and call AI
        logger.info("🧠 Sending to AI for deep analysis...")
        system_prompt, user_prompt = build_analysis_prompt(portfolio, news_data, session)
        analysis, model_used = call_openrouter(system_prompt, user_prompt)
        logger.info(f"✅ Analysis complete ({len(analysis)} chars) using {model_used}")

        # Step 5: Format and send to Telegram
        logger.info("📱 Sending to Telegram...")
        messages = format_telegram_message(analysis, portfolio, session, model_used)

        for i, msg in enumerate(messages):
            send_telegram_message(msg, parse_mode="Markdown", chat_id=chat_id)
            logger.info(f"  ✅ Sent chunk {i+1}/{len(messages)} to chat ID {chat_id}")
            if i < len(messages) - 1:
                time.sleep(1)  # Avoid Telegram rate limits

        logger.info(f"🎉 {session.capitalize()} analysis complete for user {user_id}! Sent {len(messages)} messages.")

    except Exception as e:
        error_msg = f"❌ *Stock Analyzer Error*\n\nSession: {session}\nUser ID: {user_id}\nError: `{str(e)}`\n\nCheck logs for details."
        logger.error(f"Analysis failed for user {user_id}: {e}", exc_info=True)
        try:
            send_telegram_message(error_msg, parse_mode="Markdown", chat_id=chat_id)
        except:
            pass
        raise


def run_scheduler():
    """Run the scheduler — triggers at 8:30 AM and 6:00 PM IST for all users."""
    logger.info("⏰ Scheduler started. Waiting for 8:30 AM or 6:00 PM IST...")
    print("⏰ Scheduler running. Press Ctrl+C to stop.\n")

    last_morning_run = None
    last_evening_run = None

    while True:
        now = datetime.now(IST)
        today = now.date()

        # Morning trigger: 8:30 AM IST
        if now.hour == MORNING_HOUR and now.minute >= 30 and last_morning_run != today:
            print(f"\n🌅 [{now.strftime('%H:%M')}] Running MORNING analysis for all users...")
            from utils.db import db_get_users_with_portfolios
            users = db_get_users_with_portfolios()
            print(f"Found {len(users)} users with configured portfolios and Telegram settings.")
            for u in users:
                try:
                    run_analysis("morning", user_id=u["id"], chat_id=u["telegram_chat_id"])
                except Exception as e:
                    print(f"Error running morning analysis for {u['email']}: {e}")
            last_morning_run = today

        # Evening trigger: 6:00 PM IST
        elif now.hour == EVENING_HOUR and now.minute >= 0 and last_evening_run != today:
            print(f"\n🌆 [{now.strftime('%H:%M')}] Running EVENING analysis for all users...")
            from utils.db import db_get_users_with_portfolios
            users = db_get_users_with_portfolios()
            print(f"Found {len(users)} users with configured portfolios and Telegram settings.")
            for u in users:
                try:
                    run_analysis("evening", user_id=u["id"], chat_id=u["telegram_chat_id"])
                except Exception as e:
                    print(f"Error running evening analysis for {u['email']}: {e}")
            last_evening_run = today

        time.sleep(60)  # Check every minute


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # Manual trigger: python analyzer.py morning / evening
        session = sys.argv[1] if sys.argv[1] in ["morning", "evening"] else "morning"
        print(f"🔧 Manual trigger: {session} analysis for all users")
        from utils.db import db_get_users_with_portfolios
        users = db_get_users_with_portfolios()
        if not users:
            print("No users found with configured Telegram IDs in the database.")
            # Try running with default settings
            print("Running with default settings...")
            run_analysis(session)
        else:
            print(f"Running analysis for {len(users)} users...")
            for u in users:
                try:
                    run_analysis(session, user_id=u["id"], chat_id=u["telegram_chat_id"])
                except Exception as e:
                    print(f"Error for user {u['email']}: {e}")
    else:
        # Start scheduler
        run_scheduler()
