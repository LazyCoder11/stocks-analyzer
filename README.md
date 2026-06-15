# AI-Powered Stock Portfolio Analyzer & Dashboard

A premium, production-ready stock portfolio management and automated market analysis system. It aggregates your holdings, fetches live market details, calculates advanced technical indicators, aggregates news feeds, and delivers a twice-daily custom AI market review directly to your Telegram.

**Live Production Demo**: [https://stock-analyzer-app-t95f.onrender.com/](https://stock-analyzer-app-t95f.onrender.com/)

---

## Core Features

*   **Premium SaaS Dashboard**: A beautiful, modern glassmorphic interface with real-time portfolio value, P&L status, and assets management.
*   **Dynamic Visualizations**: Integrated **Chart.js** to render live Sector Allocation doughnut charts and side-by-side Invested vs. Current Value performance bar charts.
*   **AI-Powered Reports**: Morning Pre-Market reports (global indices, watchlist alerts, daily targets) and Evening Market Wrap-Ups (accumulation/profit-booking advice, news analysis).
*   **Resilient AI Pipeline**: Uses OpenRouter to execute deep-level analysis with a smart, multi-model fallback chain:
    $$\text{Claude 3.5 Sonnet} \longrightarrow \text{GPT-4o} \longrightarrow \text{Gemini 1.5 Pro} \longrightarrow \text{Llama 3 405B}$$
*   **Dual-Mode Persistence**: Automatically connects to a **PostgreSQL Database** in production (via Render) and falls back to a local `portfolio.json` file for offline development.
*   **One-Click Deployments**: Configured with a `render.yaml` blueprint to easily provision a hosted database and a Gunicorn-powered web app.
*   **Public Demo Mode**: Visitors can input their custom Telegram Chat ID directly on the live dashboard to receive their customized portfolio reports on their phone.

---

## Architecture

```
                 [ Web Browser Dashboard ] 
                            │
                            ▼
                     [ Flask Backend ] ◄──► [ PostgreSQL (Prod) / JSON (Local) ]
                            │
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
[ Yahoo Finance API ]                 [ Google News RSS Feed ]
(Live prices & Technics:              (Historical / Stock-specific 
 RSI, MACD, Moving Averages)           news correlations)
         │                                     │
         └──────────────────┬──────────────────┘
                            ▼
             [ OpenRouter AI Analysis ]
             (Claude 4.5/3.5 → GPT-4o → Gemini)
                            │
                            ▼
              [ Telegram Delivery System ]
             (Delivered to your custom Chat ID)
```

---

## Quick Start (Local Setup)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Rename the template `.env.example` file to `.env` and fill in your parameters:
```bash
cp .env.example .env
```
Inside your `.env` file:
*   `OPENROUTER_API_KEY`: Your OpenRouter API key.
*   `TELEGRAM_BOT_TOKEN`: Token from [@BotFather](https://t.me/BotFather).
*   `TELEGRAM_CHAT_ID`: Your Telegram user ID (get via [@userinfobot](https://t.me/userinfobot)).
*   `DATABASE_URL`: Leave blank to fallback to local JSON storage.

### 3. Run the Web Dashboard
```bash
python web_app.py
```
Open [http://localhost:5000](http://localhost:5000) in your browser to start adding stocks!

### 4. Trigger Analysis Manually
```bash
python analyzer.py morning   # Run morning pre-market analysis
python analyzer.py evening   # Run evening market wrap-up analysis
```

---

## Deploying to Render.com (Free Database & Hosting)

This repository includes a `render.yaml` Blueprint file, which automatically configures a PostgreSQL database and a Flask web service together in one click:

1. Push your code to a repository on **GitHub** (you can keep it Public since secrets are excluded).
2. Log in to [Render.com](https://dashboard.render.com/) and go to **Blueprints**.
3. Click **New Blueprint Instance** and connect your repository.
4. Input your `OPENROUTER_API_KEY`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` when prompted by the UI.
5. Click **Apply**. Render will handle setting up the Postgres connection and Gunicorn server automatically!

### Scheduling Daily Reports
To run reports automatically at 8:30 AM and 6:00 PM IST daily without paying for Render's cron jobs, use [Cron-Job.org](https://cron-job.org/) to hit your Render app's analysis API:
*   **Morning Trigger**: `POST https://YOUR_APP.onrender.com/api/run-analysis` with body `{"session": "morning"}`.
*   **Evening Trigger**: `POST https://YOUR_APP.onrender.com/api/run-analysis` with body `{"session": "evening"}`.

---

## Technologies Used

*   **Backend**: Python, Flask, Gunicorn
*   **Frontend**: Vanilla HTML5, CSS Grid/Flexbox (Custom Glassmorphism styling), Vanilla JS
*   **Charts**: Chart.js
*   **Icons**: Lucide Icons
*   **Market Data**: yfinance, pandas
*   **Database**: PostgreSQL / psycopg2
*   **AI Integration**: OpenRouter API

---

## Disclaimer

This application is created for portfolio showcase and educational purposes only. The stock analysis and recommendations are AI-generated, based on historical indicators and news feed headlines, and **do not constitute financial advice**. Always do your own research before trading.
