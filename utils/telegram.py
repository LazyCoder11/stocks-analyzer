import logging
import requests
from config.settings import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

logger = logging.getLogger(__name__)

TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def send_telegram_message(text: str, parse_mode: str = "Markdown") -> bool:
    """Send a text message to Telegram."""
    try:
        payload = {
            "chat_id":    TELEGRAM_CHAT_ID,
            "text":       text,
            "disable_web_page_preview": True,
        }
        if parse_mode:
            payload["parse_mode"] = parse_mode

        response = requests.post(
            f"{TELEGRAM_API}/sendMessage",
            json=payload,
            timeout=15
        )

        if response.status_code == 200:
            return True
        else:
            logger.error(f"Telegram error {response.status_code}: {response.text}")
            # Try sending without markdown if formatting failed
            if parse_mode == "Markdown":
                return send_telegram_message(text, parse_mode=None)
            return False

    except Exception as e:
        logger.error(f"Telegram send error: {e}")
        return False


def send_telegram_photo(image_path: str, caption: str = "") -> bool:
    """Send an image with optional caption."""
    try:
        with open(image_path, "rb") as img:
            response = requests.post(
                f"{TELEGRAM_API}/sendPhoto",
                data={"chat_id": TELEGRAM_CHAT_ID, "caption": caption, "parse_mode": "Markdown"},
                files={"photo": img},
                timeout=30
            )
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Telegram photo error: {e}")
        return False


def test_telegram_connection() -> bool:
    """Test if bot token and chat_id are working."""
    msg = (
        "✅ *Stock Analyzer Bot Connected!*\n\n"
        "Your portfolio analysis bot is now active.\n"
        "You'll receive insights at *8:30 AM* and *6:00 PM IST* daily.\n\n"
        "_Test message from Stock Analyzer_"
    )
    success = send_telegram_message(msg)
    if success:
        logger.info("✅ Telegram connection test passed")
    else:
        logger.error("❌ Telegram connection test FAILED")
    return success
