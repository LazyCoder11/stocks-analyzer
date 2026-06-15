import os
from pathlib import Path

# Load .env automatically (python-dotenv)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass  # dotenv optional; env vars can be set by OS too

def _require(key: str) -> str:
    """Read an env var; raise a clear error if missing/placeholder."""
    val = os.environ.get(key, "")
    if not val or val.startswith("YOUR_"):
        raise EnvironmentError(
            f"❌ '{key}' is not set.\n"
            f"   Open .env in the project root and fill in your value.\n"
            f"   See README.md for instructions."
        )
    return val

# ─── OpenRouter API ─────────────────────────────────────────────────────────────
OPENROUTER_API_KEY = _require("OPENROUTER_API_KEY")

# ─── Telegram Bot ────────────────────────────────────────────────────────────────
# Chat ID: message @userinfobot on Telegram to get your personal ID
TELEGRAM_BOT_TOKEN = _require("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID   = _require("TELEGRAM_CHAT_ID")

# ─── Google Sheets ───────────────────────────────────────────────────────────────
_sources = [s.strip().lower() for s in os.environ.get("PORTFOLIO_SOURCES", "local").split(",") if s.strip()]
if "sheets" in _sources:
    GOOGLE_SHEETS_ID = _require("GOOGLE_SHEETS_ID")
else:
    GOOGLE_SHEETS_ID = os.environ.get("GOOGLE_SHEETS_ID", "")

GOOGLE_SHEET_TAB_NAME   = os.environ.get("GOOGLE_SHEET_TAB_NAME", "Portfolio")
GOOGLE_CREDENTIALS_PATH = os.environ.get("GOOGLE_CREDENTIALS_PATH", "config/google_credentials.json")

# ─── Schedule Times (IST 24hr) ──────────────────────────────────────────────────
MORNING_HOUR = 8   # 8:30 AM IST
EVENING_HOUR = 18  # 6:00 PM IST

# ─── News Settings ───────────────────────────────────────────────────────────────
NEWS_FETCH_DAYS    = 2   # Fetch news from past N days
MAX_NEWS_PER_STOCK = 5   # Max articles per stock

# ─── Analysis Depth ──────────────────────────────────────────────────────────────
INCLUDE_TECHNICAL    = True   # RSI, MACD, moving averages
INCLUDE_FUNDAMENTALS = True   # P/E, earnings, debt

# ─── Ensure logs/ directory always exists ────────────────────────────────────────
(Path(__file__).parent.parent / "logs").mkdir(exist_ok=True)
