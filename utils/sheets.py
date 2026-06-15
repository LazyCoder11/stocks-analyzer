"""
📋 Google Sheets Integration
Reads portfolio data from your Google Sheet.

Expected Sheet Format (columns):
| Symbol | Company Name | Quantity | Buy Price | Exchange |
|--------|--------------|----------|-----------|----------|
| RELIANCE | Reliance Industries | 10 | 2450.00 | NSE |
| TCS | Tata Consultancy | 5 | 3800.00 | NSE |
"""

import logging
from config.settings import GOOGLE_SHEETS_ID, GOOGLE_SHEET_TAB_NAME, GOOGLE_CREDENTIALS_PATH

logger = logging.getLogger(__name__)


def fetch_portfolio_from_sheets() -> list:
    """
    Fetch portfolio data from Google Sheets.
    Returns list of dicts with stock data.
    """
    try:
        import gspread
        from google.oauth2.service_account import Credentials

        scopes = [
            "https://www.googleapis.com/auth/spreadsheets.readonly",
            "https://www.googleapis.com/auth/drive.readonly"
        ]

        creds = Credentials.from_service_account_file(GOOGLE_CREDENTIALS_PATH, scopes=scopes)
        client = gspread.authorize(creds)

        sheet = client.open_by_key(GOOGLE_SHEETS_ID).worksheet(GOOGLE_SHEET_TAB_NAME)
        records = sheet.get_all_records()

        portfolio = []
        for row in records:
            # Skip empty rows
            if not row.get("Symbol") or not str(row.get("Symbol", "")).strip():
                continue

            symbol = str(row["Symbol"]).strip().upper()
            exchange = str(row.get("Exchange", "NSE")).strip().upper()

            # For yfinance: NSE stocks need ".NS", BSE stocks need ".BO"
            yf_symbol = f"{symbol}.NS" if exchange == "NSE" else f"{symbol}.BO"

            portfolio.append({
                "symbol": symbol,
                "yf_symbol": yf_symbol,
                "company_name": str(row.get("Company Name", symbol)).strip(),
                "quantity": float(str(row.get("Quantity", 0)).replace(",", "")),
                "buy_price": float(str(row.get("Buy Price", 0)).replace(",", "").replace("₹", "")),
                "exchange": exchange,
                "sector": str(row.get("Sector", "")).strip(),  # Optional column
                "notes": str(row.get("Notes", "")).strip(),    # Optional notes column
            })

        logger.info(f"Fetched {len(portfolio)} stocks from Google Sheets")
        return portfolio

    except ImportError:
        raise ImportError("Run: pip install gspread google-auth")
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Google credentials not found at '{GOOGLE_CREDENTIALS_PATH}'. "
            "Download service account JSON from Google Cloud Console."
        )
    except Exception as e:
        logger.error(f"Sheets fetch error: {e}")
        raise


# ─── Quick test with sample data (for testing without Google Sheets) ─────────────
SAMPLE_PORTFOLIO = [
    {"symbol": "RELIANCE",  "yf_symbol": "RELIANCE.NS",  "company_name": "Reliance Industries",    "quantity": 10, "buy_price": 2450.0, "exchange": "NSE", "sector": "Energy"},
    {"symbol": "TCS",       "yf_symbol": "TCS.NS",        "company_name": "Tata Consultancy Svcs",  "quantity":  5, "buy_price": 3800.0, "exchange": "NSE", "sector": "IT"},
    {"symbol": "HDFCBANK",  "yf_symbol": "HDFCBANK.NS",   "company_name": "HDFC Bank",              "quantity": 15, "buy_price": 1650.0, "exchange": "NSE", "sector": "Banking"},
    {"symbol": "INFY",      "yf_symbol": "INFY.NS",       "company_name": "Infosys",                "quantity":  8, "buy_price": 1480.0, "exchange": "NSE", "sector": "IT"},
    {"symbol": "TATAMOTORS","yf_symbol": "TATAMOTORS.NS", "company_name": "Tata Motors",            "quantity": 20, "buy_price":  780.0, "exchange": "NSE", "sector": "Auto"},
]


def fetch_sample_portfolio() -> list:
    """Use this for testing without Google Sheets credentials."""
    logger.info("⚠️  Using SAMPLE portfolio data (not real Google Sheets)")
    return SAMPLE_PORTFOLIO
