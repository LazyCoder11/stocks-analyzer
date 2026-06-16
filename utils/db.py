import os
import sqlite3
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

LOCAL_DB_FILE = Path("data/stock_analyzer.db")

def get_db_connection():
    """Create a connection to the database. Uses PostgreSQL if DATABASE_URL is set, otherwise SQLite."""
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        import psycopg2
        try:
            conn = psycopg2.connect(db_url, sslmode="require")
            return conn, "postgres"
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise
    else:
        LOCAL_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
        try:
            conn = sqlite3.connect(str(LOCAL_DB_FILE))
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn, "sqlite"
        except Exception as e:
            logger.error(f"Failed to connect to SQLite: {e}")
            raise

def run_query(query: str, params: tuple = (), fetch: bool = True):
    """Run a query and handle connection opening/closing and placeholder replacement."""
    conn, conn_type = get_db_connection()
    if conn_type == "sqlite":
        # Replace PostgreSQL placeholder %s with SQLite placeholder ?
        query = query.replace("%s", "?")
    
    cur = conn.cursor()
    try:
        cur.execute(query, params)
        if fetch:
            rows = cur.fetchall()
            # Get column names
            colnames = [desc[0] for desc in cur.description] if cur.description else []
            return [dict(zip(colnames, row)) for row in rows]
        else:
            conn.commit()
            return None
    except Exception as e:
        logger.error(f"Database error executing query: {query} | Error: {e}")
        try:
            conn.rollback()
        except:
            pass
        raise e
    finally:
        cur.close()
        conn.close()

def init_db():
    """Initialize the PostgreSQL or SQLite database tables."""
    # Table creation queries
    create_users = """
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        telegram_chat_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    
    create_portfolio = """
    CREATE TABLE IF NOT EXISTS portfolio (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        yf_symbol VARCHAR(20) NOT NULL,
        company_name VARCHAR(100),
        quantity DOUBLE PRECISION NOT NULL,
        buy_price DOUBLE PRECISION NOT NULL,
        exchange VARCHAR(10) NOT NULL,
        sector VARCHAR(50),
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """
    
    try:
        run_query(create_users, fetch=False)
        run_query(create_portfolio, fetch=False)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

# Load portfolio for a specific user
def db_load_portfolio(user_id: str) -> list:
    """Load portfolio for a specific user."""
    query = """
        SELECT id, symbol, yf_symbol, company_name, quantity, buy_price, exchange, sector, notes 
        FROM portfolio 
        WHERE user_id = %s;
    """
    try:
        rows = run_query(query, (user_id,))
        # Convert values to correct types
        portfolio = []
        for r in rows:
            portfolio.append({
                "id": r["id"],
                "symbol": r["symbol"],
                "yf_symbol": r["yf_symbol"],
                "company_name": r["company_name"] or r["symbol"],
                "quantity": float(r["quantity"]),
                "buy_price": float(r["buy_price"]),
                "exchange": r["exchange"],
                "sector": r["sector"] or "",
                "notes": r["notes"] or ""
            })
        return portfolio
    except Exception as e:
        logger.error(f"Error loading portfolio for user {user_id}: {e}")
        return []

# Save portfolio for a specific user
def db_save_portfolio(user_id: str, portfolio: list):
    """Save user's portfolio by syncing the DB with the given list."""
    try:
        # Delete existing portfolio records for this user
        delete_query = "DELETE FROM portfolio WHERE user_id = %s;"
        run_query(delete_query, (user_id,), fetch=False)
        
        # Insert the updated list
        insert_query = """
            INSERT INTO portfolio (id, user_id, symbol, yf_symbol, company_name, quantity, buy_price, exchange, sector, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """
        for s in portfolio:
            run_query(insert_query, (
                s.get("id"),
                user_id,
                s.get("symbol"),
                s.get("yf_symbol"),
                s.get("company_name", s.get("symbol")),
                float(s.get("quantity")),
                float(s.get("buy_price")),
                s.get("exchange"),
                s.get("sector", ""),
                s.get("notes", "")
            ), fetch=False)
        logger.info(f"Successfully saved portfolio for user {user_id}.")
    except Exception as e:
        logger.error(f"Error saving portfolio for user {user_id}: {e}")
        raise

# User authentication helper methods
def db_get_user_by_email(email: str) -> dict:
    """Retrieve user details by email."""
    query = "SELECT id, email, password_hash, telegram_chat_id FROM users WHERE email = %s;"
    rows = run_query(query, (email.lower().strip(),))
    return rows[0] if rows else None

def db_get_user_by_id(user_id: str) -> dict:
    """Retrieve user details by user ID."""
    query = "SELECT id, email, telegram_chat_id FROM users WHERE id = %s;"
    rows = run_query(query, (user_id,))
    return rows[0] if rows else None

def db_create_user(user_id: str, email: str, password_hash: str) -> dict:
    """Create a new user in the database."""
    query = """
        INSERT INTO users (id, email, password_hash)
        VALUES (%s, %s, %s);
    """
    run_query(query, (user_id, email.lower().strip(), password_hash), fetch=False)
    return {"id": user_id, "email": email}

def db_update_user_telegram(user_id: str, telegram_chat_id: str):
    """Update a user's Telegram Chat ID."""
    query = "UPDATE users SET telegram_chat_id = %s WHERE id = %s;"
    run_query(query, (telegram_chat_id, user_id), fetch=False)

def db_get_users_with_portfolios() -> list:
    """Get list of users who have a configured telegram chat ID."""
    query = """
        SELECT DISTINCT u.id, u.email, u.telegram_chat_id 
        FROM users u 
        JOIN portfolio p ON u.id = p.user_id 
        WHERE u.telegram_chat_id IS NOT NULL AND u.telegram_chat_id != '';
    """
    return run_query(query)

# Initialize DB on load
init_db()
