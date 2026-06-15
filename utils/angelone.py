"""
📦 Portfolio Source: Angel One (SmartAPI)
Fetches live holdings directly from your Angel One Demat account.

Setup:
1. Register at https://smartapi.angelbroking.com/ (free)
2. Create an App → get your API_KEY
3. Enable TOTP in Angel One app: Profile → Security → TOTP
4. Add to .env:
      ANGELONE_API_KEY=your_api_key
      ANGELONE_CLIENT_ID=your_client_id     (e.g. A123456)
      ANGELONE_MPIN=your_4digit_mpin
      ANGELONE_TOTP_SECRET=your_totp_secret  (from QR code when enabling TOTP)
"""

import os
import logging
import pyotp

logger = logging.getLogger(__name__)


def fetch_angelone_portfolio() -> list:
    """
    Fetch live holdings from Angel One via SmartAPI.
    Returns same format as Google Sheets portfolio list.
    """
    api_key    = os.environ.get("ANGELONE_API_KEY", "")
    client_id  = os.environ.get("ANGELONE_CLIENT_ID", "")
    mpin       = os.environ.get("ANGELONE_MPIN", "")
    totp_secret = os.environ.get("ANGELONE_TOTP_SECRET", "")

    if not all([api_key, client_id, mpin, totp_secret]):
        raise EnvironmentError(
            "Angel One credentials missing in .env.\n"
            "Need: ANGELONE_API_KEY, ANGELONE_CLIENT_ID, ANGELONE_MPIN, ANGELONE_TOTP_SECRET\n"
            "See utils/angelone.py for setup instructions."
        )

    try:
        from SmartApi import SmartConnect
    except ImportError:
        raise ImportError("Run: pip install smartapi-python pyotp")

    totp_code = pyotp.TOTP(totp_secret).now()

    obj = SmartConnect(api_key=api_key)
    session = obj.generateSession(client_id, mpin, totp_code)
    if not session.get("status"):
        raise Exception(f"Angel One login failed: {session.get('message', 'Unknown error')}")

    logger.info("✅ Angel One login successful")

    holdings_resp = obj.holding()
    if not holdings_resp.get("status") or not holdings_resp.get("data"):
        logger.warning("No holdings found in Angel One account")
        return []

    portfolio = []
    for h in holdings_resp["data"]:
        symbol  = h.get("tradingsymbol", "").replace("-EQ", "").strip()
        qty     = float(h.get("quantity", 0))
        avg_buy = float(h.get("averageprice", 0))
        exchange = h.get("exchange", "NSE").upper()

        if not symbol or qty <= 0:
            continue

        portfolio.append({
            "symbol":       symbol,
            "yf_symbol":    f"{symbol}.NS" if exchange == "NSE" else f"{symbol}.BO",
            "company_name": h.get("symbolname", symbol),
            "quantity":     qty,
            "buy_price":    avg_buy,
            "exchange":     exchange,
            "sector":       "",   # SmartAPI doesn't return sector directly
            "notes":        f"Source: Angel One | ISIN: {h.get('isin','')}",
        })

    logger.info(f"Fetched {len(portfolio)} holdings from Angel One")
    obj.terminateSession(client_id)
    return portfolio
