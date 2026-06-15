import os
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

LOCAL_PORTFOLIO_FILE = Path("data/portfolio.json")

def get_db_connection():
    """Create a connection to the PostgreSQL database if DATABASE_URL is set."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return None
    
    # Render database URL might start with postgres:// instead of postgresql://
    # Python's psycopg2 supports postgres://, but SQLAlchemy/other libraries sometimes need postgresql://
    # We will use raw psycopg2 so postgres:// is perfectly fine.
    import psycopg2
    try:
        conn = psycopg2.connect(db_url, sslmode="require")
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        return None

def init_db():
    """Initialize the database table if it doesn't exist."""
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS portfolio (
                    id VARCHAR(50) PRIMARY KEY,
                    symbol VARCHAR(20) NOT NULL,
                    yf_symbol VARCHAR(20) NOT NULL,
                    company_name VARCHAR(100),
                    quantity DOUBLE PRECISION NOT NULL,
                    buy_price DOUBLE PRECISION NOT NULL,
                    exchange VARCHAR(10) NOT NULL,
                    sector VARCHAR(50),
                    notes TEXT
                );
            """)
            conn.commit()
            logger.info("PostgreSQL portfolio table initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing PostgreSQL table: {e}")
    finally:
        conn.close()

def db_load_portfolio() -> list:
    """Load portfolio from PostgreSQL (if DATABASE_URL is set) or fallback to JSON."""
    conn = get_db_connection()
    if not conn:
        # Fallback to local JSON
        if not LOCAL_PORTFOLIO_FILE.exists():
            return []
        try:
            return json.loads(LOCAL_PORTFOLIO_FILE.read_text(encoding="utf-8"))
        except Exception:
            return []

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, symbol, yf_symbol, company_name, quantity, buy_price, exchange, sector, notes FROM portfolio;")
            rows = cur.fetchall()
            portfolio = []
            for r in rows:
                portfolio.append({
                    "id": r[0],
                    "symbol": r[1],
                    "yf_symbol": r[2],
                    "company_name": r[3] or r[1],
                    "quantity": r[4],
                    "buy_price": r[5],
                    "exchange": r[6],
                    "sector": r[7] or "",
                    "notes": r[8] or ""
                })
            return portfolio
    except Exception as e:
        logger.error(f"Error loading portfolio from PostgreSQL: {e}")
        return []
    finally:
        conn.close()

def db_save_portfolio(portfolio: list):
    """Save the entire portfolio. If using PostgreSQL, it syncs the table. If JSON, writes to file."""
    conn = get_db_connection()
    if not conn:
        # Fallback to local JSON
        LOCAL_PORTFOLIO_FILE.parent.mkdir(parents=True, exist_ok=True)
        LOCAL_PORTFOLIO_FILE.write_text(
            json.dumps(portfolio, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        return

    try:
        with conn.cursor() as cur:
            # We will truncate and rewrite the table to keep it fully synced with the UI state.
            # This is simple, fast, and robust for small personal portfolios.
            cur.execute("TRUNCATE TABLE portfolio;")
            for s in portfolio:
                cur.execute("""
                    INSERT INTO portfolio (id, symbol, yf_symbol, company_name, quantity, buy_price, exchange, sector, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    s.get("id"),
                    s.get("symbol"),
                    s.get("yf_symbol"),
                    s.get("company_name", s.get("symbol")),
                    s.get("quantity"),
                    s.get("buy_price"),
                    s.get("exchange"),
                    s.get("sector", ""),
                    s.get("notes", "")
                ))
            conn.commit()
            logger.info("Successfully saved portfolio to PostgreSQL.")
    except Exception as e:
        logger.error(f"Error saving portfolio to PostgreSQL: {e}")
    finally:
        conn.close()

# Initialize DB on load if DB_URL is active
if os.environ.get("DATABASE_URL"):
    init_db()
