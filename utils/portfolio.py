"""
🗂️ Portfolio Aggregator
Merges holdings from all configured sources:
  - local       → data/portfolio.json (managed via web UI at localhost:5000)
  - sheets      → Google Sheets
  - angelone    → Angel One SmartAPI
  - groww       → Groww CSV export

Control which sources are active via .env:
  PORTFOLIO_SOURCES=local                   # web UI (default)
  PORTFOLIO_SOURCES=angelone,groww,sheets   # broker APIs
  (Default: local)

If a stock appears in multiple sources, quantities are ADDED together
(useful if you hold the same stock across both brokers).
"""

import os
import json
import logging
from pathlib import Path
from collections import defaultdict

LOCAL_PORTFOLIO_FILE = Path(__file__).parent.parent / "data" / "portfolio.json"

logger = logging.getLogger(__name__)


def _get_active_sources() -> list[str]:
    raw = os.environ.get("PORTFOLIO_SOURCES", "local").lower()
    return [s.strip() for s in raw.split(",") if s.strip()]


def fetch_combined_portfolio() -> list:
    """
    Fetch and merge portfolio from all configured sources.
    Stocks with the same symbol are merged (quantities summed, buy price averaged).
    """
    sources = _get_active_sources()
    logger.info(f"Portfolio sources: {sources}")

    all_stocks = []

    for source in sources:
        if source == "local":
            try:
                stocks = _load_local_portfolio()
                logger.info(f"✅ Local (web UI): {len(stocks)} stocks")
                all_stocks.extend(stocks)
            except Exception as e:
                logger.error(f"❌ Local portfolio failed: {e}")

        elif source == "sheets":
            try:
                from utils.sheets import fetch_portfolio_from_sheets
                stocks = fetch_portfolio_from_sheets()
                logger.info(f"✅ Google Sheets: {len(stocks)} stocks")
                all_stocks.extend(stocks)
            except Exception as e:
                logger.error(f"❌ Google Sheets failed: {e}")

        elif source == "angelone":
            try:
                from utils.angelone import fetch_angelone_portfolio
                stocks = fetch_angelone_portfolio()
                logger.info(f"✅ Angel One: {len(stocks)} stocks")
                all_stocks.extend(stocks)
            except Exception as e:
                logger.error(f"❌ Angel One failed: {e}")

        elif source == "groww":
            try:
                from utils.groww import fetch_groww_portfolio
                stocks = fetch_groww_portfolio()
                logger.info(f"✅ Groww: {len(stocks)} stocks")
                all_stocks.extend(stocks)
            except Exception as e:
                logger.error(f"❌ Groww failed: {e}")

        else:
            logger.warning(f"Unknown portfolio source: '{source}' — skipping")

    if not all_stocks:
        raise Exception(
            "No portfolio data fetched from any source.\n"
            f"Active sources: {sources}\n"
            "Check your credentials and source configuration in .env"
        )

    return _merge_portfolio(all_stocks)


def _merge_portfolio(stocks: list) -> list:
    """
    Merge stocks with the same symbol (from different brokers).
    Uses weighted average for buy price.
    """
    merged: dict[str, dict] = {}

    for stock in stocks:
        sym = stock["symbol"].upper()
        if sym not in merged:
            merged[sym] = stock.copy()
        else:
            # Weighted average buy price
            existing = merged[sym]
            total_qty   = existing["quantity"] + stock["quantity"]
            avg_price   = (
                (existing["buy_price"] * existing["quantity"]) +
                (stock["buy_price"]   * stock["quantity"])
            ) / total_qty if total_qty else 0

            existing["quantity"]  = total_qty
            existing["buy_price"] = round(avg_price, 2)
            existing["notes"]     = f"{existing.get('notes','')} + {stock.get('notes','')}"
            logger.debug(f"  Merged {sym}: qty={total_qty}, avg_buy=₹{avg_price:.2f}")

    result = list(merged.values())
    logger.info(f"📊 Combined portfolio: {len(result)} unique stocks from {len(stocks)} total entries")
    return result


def _load_local_portfolio() -> list:
    """Read portfolio from database or fallback to data/portfolio.json."""
    from utils.db import db_load_portfolio
    data = db_load_portfolio()
    if not data:
        raise ValueError("Portfolio is empty. Add stocks via the web dashboard.")
    return data
