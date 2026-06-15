"""
📦 Portfolio Source: Groww (CSV Import)
Groww does NOT have an official public API.

HOW TO EXPORT FROM GROWW:
  1. Open Groww app or groww.in
  2. Go to Portfolio → Stocks
  3. Tap the ⬇ Download / Export icon (top right)
  4. Choose "Download as CSV"
  5. Save it to this project as: groww_portfolio.csv

This module reads that CSV and converts it to the standard portfolio format.
Re-export whenever you buy/sell — the analyzer always reads the latest file.

Expected Groww CSV columns (may vary slightly by version):
  Stock Name, Ticker, Quantity, Average Price, LTP, Current Value, ...
"""

import os
import csv
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Default path — override with GROWW_CSV_PATH in .env
DEFAULT_CSV = Path(__file__).parent.parent / "groww_portfolio.csv"


def fetch_groww_portfolio(csv_path: str = None) -> list:
    """
    Read portfolio from a Groww-exported CSV file.
    Returns same format as Google Sheets / Angel One portfolio list.
    """
    path = Path(csv_path or os.environ.get("GROWW_CSV_PATH", "") or DEFAULT_CSV)

    if not path.exists():
        raise FileNotFoundError(
            f"Groww CSV not found at '{path}'.\n"
            "Export from Groww app: Portfolio → Stocks → ⬇ Export → Download CSV\n"
            f"Then save the file as: {DEFAULT_CSV}"
        )

    portfolio = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = [h.strip() for h in (reader.fieldnames or [])]
        logger.debug(f"Groww CSV headers: {headers}")

        for row in reader:
            # Normalize keys (Groww sometimes changes column names between versions)
            row = {k.strip(): v.strip() for k, v in row.items()}

            symbol = (
                row.get("Ticker") or
                row.get("Symbol") or
                row.get("NSE Symbol") or
                ""
            ).strip().upper().replace("-EQ", "")

            qty_raw = (
                row.get("Quantity") or
                row.get("Qty") or
                row.get("No of shares") or "0"
            ).replace(",", "")

            price_raw = (
                row.get("Average Price") or
                row.get("Avg Cost Price") or
                row.get("Buy Price") or "0"
            ).replace(",", "").replace("₹", "")

            company_name = (
                row.get("Stock Name") or
                row.get("Company Name") or
                symbol
            ).strip()

            if not symbol:
                continue

            try:
                qty   = float(qty_raw) if qty_raw else 0.0
                price = float(price_raw) if price_raw else 0.0
            except ValueError:
                logger.warning(f"Skipping row with invalid numbers: {row}")
                continue

            if qty <= 0:
                continue

            portfolio.append({
                "symbol":       symbol,
                "yf_symbol":    f"{symbol}.NS",   # Groww is NSE by default
                "company_name": company_name,
                "quantity":     qty,
                "buy_price":    price,
                "exchange":     "NSE",
                "sector":       row.get("Sector", ""),
                "notes":        f"Source: Groww CSV ({path.name})",
            })

    logger.info(f"Loaded {len(portfolio)} stocks from Groww CSV: {path.name}")
    return portfolio
