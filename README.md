# 📊 Stock Portfolio Analyzer Bot

Reads your portfolio from Google Sheets → Fetches latest NSE/BSE news → Deep AI analysis via OpenRouter → Sends to Telegram **twice daily**.

---

## 🏗️ Architecture

```
Google Sheets (your portfolio)
        ↓
  Python Script
        ↓
Yahoo Finance API  →  Live prices + Technical indicators (RSI, MACD, MAs)
Google News RSS    →  Latest news per stock
Economic Times RSS →  Indian financial news
        ↓
  OpenRouter AI (Claude → GPT-4o → Gemini → Llama fallback)
        ↓
  Telegram Bot → You 📱
```

---

## ⚡ Quick Start

### Step 1 — Install dependencies
```bash
pip install -r requirements.txt
```

### Step 2 — Set up credentials (4 things needed)

#### A. OpenRouter API Key
1. Go to https://openrouter.ai → Sign up
2. Dashboard → API Keys → Create key
3. Add credits ($5 will last months for this use case)
4. Paste key in `config/settings.py` → `OPENROUTER_API_KEY`

#### B. Telegram Bot
1. Open Telegram → search `@BotFather`
2. Send `/newbot` → follow instructions → copy the token
3. Paste in `config/settings.py` → `TELEGRAM_BOT_TOKEN`
4. Start your new bot (search it and press Start)
5. Get your Chat ID: visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   Look for `"chat":{"id": 123456789}` — that number is your Chat ID
6. Paste in `config/settings.py` → `TELEGRAM_CHAT_ID`

#### C. Google Sheets Setup
1. Go to https://console.cloud.google.com
2. Create a new project → Enable **Google Sheets API** and **Google Drive API**
3. Go to IAM → Service Accounts → Create service account
4. Create a JSON key → Download it → Save as `config/google_credentials.json`
5. Copy the service account email (looks like: `xxx@xxx.iam.gserviceaccount.com`)
6. Open your Google Sheet → Share → paste that email → Viewer access

#### D. Google Sheet Format
Create a sheet with these exact column headers in Row 1:

| Symbol | Company Name | Quantity | Buy Price | Exchange | Sector |
|--------|--------------|----------|-----------|----------|--------|
| RELIANCE | Reliance Industries | 10 | 2450 | NSE | Energy |
| TCS | Tata Consultancy Services | 5 | 3800 | NSE | IT |
| HDFCBANK | HDFC Bank | 15 | 1650 | NSE | Banking |

- **Symbol**: NSE/BSE ticker (e.g., RELIANCE, TCS, INFY)
- **Exchange**: NSE or BSE
- **Sector**: Optional but improves analysis

Copy your Sheet ID from the URL:
`https://docs.google.com/spreadsheets/d/`**`THIS_LONG_ID`**`/edit`

Paste in `config/settings.py` → `GOOGLE_SHEETS_ID`

### Step 3 — Test everything
```bash
python setup_and_test.py
```
This tests all 6 connections and optionally sends a sample analysis to your Telegram.

### Step 4 — Run it!

**Manual run (test):**
```bash
python analyzer.py morning    # Morning analysis now
python analyzer.py evening    # Evening analysis now
```

**Start the scheduler (runs automatically every day):**
```bash
python analyzer.py
```
Runs at **8:30 AM IST** and **6:00 PM IST** daily.

---

## 🤖 AI Model Fallback Chain

The bot tries these models in order, automatically falling back if one is unavailable:

1. 🥇 `anthropic/claude-sonnet-4-5` — Best analysis quality
2. 🥈 `openai/gpt-4o` — Strong fallback
3. 🥉 `google/gemini-pro-1.5` — Good alternative
4. 4️⃣  `meta-llama/llama-3.1-405b-instruct` — Last resort

You'll see which model was used in each Telegram message.

---

## 📱 What You'll Receive

Each Telegram message includes:

**🌅 Morning (8:30 AM) — Pre-Market Report:**
- Global cues: US markets, SGX Nifty, crude oil, dollar index
- Portfolio snapshot with live prices and P&L
- Stock-by-stock analysis with BUY/SELL/HOLD recommendations
- Price targets and stop-loss levels
- Intraday alerts to watch

**🌆 Evening (6:00 PM) — End-of-Day Report:**
- Today's market summary and your portfolio performance
- News impact assessment
- What to watch tomorrow
- Accumulation or profit-booking suggestions
- Week-ahead outlook

---

## ⏰ Running 24/7 (Keep-alive on free server)

### Option A — Local machine (simplest)
Just keep the terminal open:
```bash
python analyzer.py
```

### Option B — Free cloud (PythonAnywhere)
1. Sign up at https://www.pythonanywhere.com (free tier works)
2. Upload all files
3. Set up a scheduled task: `python /home/username/stock-analyzer/analyzer.py morning`
   - Run at 08:30 IST
   - Run at 18:00 IST

### Option C — Railway / Render (free cloud)
1. Push to GitHub (keep credentials in env variables, not code)
2. Deploy to Railway.app or Render.com
3. Use `start_command: python analyzer.py`

---

## 🔧 Updating Your Portfolio

Just update your Google Sheet — the bot reads fresh data every time it runs.
No code changes needed!

---

## ⚠️ Disclaimer

This bot provides AI-generated analysis for informational purposes only.
It is NOT financial advice. Always do your own research before investing.
Past performance does not guarantee future results.
