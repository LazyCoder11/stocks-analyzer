# AI-Powered Stock Portfolio Analyzer & Dashboard (Next.js Edition)

A premium, production-ready multi-user stock portfolio management and automated market analysis system. It features a modern **Next.js** frontend with **secure user login**, user-specific portfolios, and automated technical indicators. It aggregates your holdings, fetches live market details, calculates advanced indicators, aggregates news feeds, and delivers a twice-daily custom AI market review directly to your Telegram.

---

## Core Features

*   **Multi-User Authentication**: Secure user signup, login, and session management using HTTP-only cookies and JWT tokens.
*   **Personalized Portfolios**: Each user manages their own set of stock holdings (stored in a shared SQLite/PostgreSQL database) with live P&L tracking.
*   **Premium Glassmorphic Dashboard**: A beautiful, responsive dark-mode interface built using React components and custom Vanilla CSS.
*   **Interactive Visualizations**: Integrated **Chart.js** via React-Chartjs-2 to render live, custom Sector Allocation doughnut charts and side-by-side performance bar charts.
*   **Automated AI Reports**: Morning Pre-Market reports (global indices, watchlist alerts, daily targets) and Evening Market Wrap-Ups (accumulation/profit-booking advice, news analysis) generated specifically for each user's unique portfolio.
*   **Shared Database Layer**: Seamlessly queries a **PostgreSQL Database** in production and falls back to a shared SQLite database (`data/stock_analyzer.db`) for offline development.
*   **Telegram Custom Routing**: Users set up their own Telegram Chat ID directly on their dashboard to receive their customized reports.

---

## Architecture

```
                 [ Next.js Frontend (Port 3000) ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ Shared Database ]               [ Flask Backend (Port 5000) ]
  (SQLite / PostgreSQL)              (yfinance, technical indicators,
  - User accounts                     news rss feeds, OpenRouter AI)
  - User portfolios                           │
                                              ▼
                                 [ Telegram Bot Delivery ]
                             (Custom chat ID per user portfolio)
```

---

## Quick Start (Local Setup)

### 1. Configure Environment Variables
Rename the template `.env.example` file to `.env` in the root folder and fill in your parameters:
```bash
cp .env.example .env
```
Inside your `.env` file:
*   `OPENROUTER_API_KEY`: Your OpenRouter API key.
*   `TELEGRAM_BOT_TOKEN`: Token from [@BotFather](https://t.me/BotFather).
*   `DATABASE_URL`: Leave blank to fallback to a shared local SQLite database (`data/stock_analyzer.db`).
*   `JWT_SECRET`: A secure random string for signing login sessions.

### 2. Run the Python Backend & Microservice
First, install the Python dependencies and start the Flask service on port 5000:
```bash
pip install -r requirements.txt
python web_app.py
```

### 3. Run the Next.js Frontend
In a new terminal window, navigate to the `web/` folder, install Node dependencies, and start the development server on port 3000:
```bash
cd web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to sign up, log in, and manage your portfolio!

### 4. Trigger Analysis / Run Scheduler
To start the automatic report scheduler (which triggers daily at 8:30 AM and 6:00 PM IST for all active users):
```bash
python analyzer.py
```
To run the analysis manually for all users immediately:
```bash
python analyzer.py morning
```

---

## Technologies Used

*   **Frontend**: Next.js (App Router), React, TypeScript, React-Chartjs-2, Lucide React, Vanilla CSS modules (dark-mode glassmorphic theme)
*   **Session Management**: JWT (JsonWebToken), bcryptjs, HTTP-only cookie authentication
*   **Python Backend**: Python, Flask, Gunicorn
*   **Market Data**: yfinance, pandas
*   **Database**: SQLite (local dev) / PostgreSQL (production)
*   **AI Integration**: OpenRouter API (Claude 3.5 Sonnet / GPT-4o / Gemini)
*   **Delivery**: Telegram Bot API

---

## Disclaimer

This application is created for portfolio showcase and educational purposes only. The stock analysis and recommendations are AI-generated, based on historical indicators and news feed headlines, and **do not constitute financial advice**. Always do your own research before trading.alysis and recommendations are AI-generated, based on historical indicators and news feed headlines, and **do not constitute financial advice**. Always do your own research before trading.
