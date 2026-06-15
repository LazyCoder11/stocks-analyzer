"""
📰 News Fetcher
Fetches latest news for Indian stocks from multiple free sources.
Sources: Yahoo Finance, Google News RSS, Economic Times RSS, MoneyControl
"""

import logging
import requests
import feedparser
from datetime import datetime, timedelta
from config.settings import NEWS_FETCH_DAYS, MAX_NEWS_PER_STOCK

logger = logging.getLogger(__name__)


def fetch_yahoo_news(symbol: str, yf_symbol: str = None) -> list:
    """Fetch news from Yahoo Finance (free, no API key needed)."""
    import yfinance as yf
    articles = []
    try:
        ticker_sym = yf_symbol or f"{symbol}.NS"
        ticker = yf.Ticker(ticker_sym)
        news = ticker.news or []
        for item in news[:MAX_NEWS_PER_STOCK]:
            articles.append({
                "title":     item.get("title", ""),
                "source":    item.get("publisher", "Yahoo Finance"),
                "url":       item.get("link", ""),
                "published": datetime.fromtimestamp(item.get("providerPublishTime", 0)).strftime("%d %b %H:%M"),
                "summary":   item.get("summary", ""),
            })
    except Exception as e:
        logger.debug(f"Yahoo news error for {symbol}: {e}")
    return articles


def fetch_google_news_rss(company_name: str, symbol: str) -> list:
    """Fetch from Google News RSS — no API key needed."""
    articles = []
    try:
        # Search for both symbol and company name for better coverage
        queries = [
            f"{company_name} NSE stock",
            f"{symbol} share price India",
        ]
        for query in queries:
            url = f"https://news.google.com/rss/search?q={requests.utils.quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"
            feed = feedparser.parse(url)
            cutoff = datetime.now() - timedelta(days=NEWS_FETCH_DAYS)

            for entry in feed.entries[:3]:
                try:
                    pub_date = datetime(*entry.published_parsed[:6])
                    if pub_date < cutoff:
                        continue
                    articles.append({
                        "title":     entry.title,
                        "source":    entry.get("source", {}).get("title", "Google News"),
                        "url":       entry.link,
                        "published": pub_date.strftime("%d %b %H:%M"),
                        "summary":   entry.get("summary", "")[:300],
                    })
                except:
                    continue

            if len(articles) >= MAX_NEWS_PER_STOCK:
                break
    except Exception as e:
        logger.debug(f"Google News RSS error for {company_name}: {e}")
    return articles


def fetch_et_rss(symbol: str) -> list:
    """Fetch from Economic Times RSS feeds (major Indian financial news)."""
    articles = []
    try:
        # ET Markets RSS feeds
        feeds = [
            "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",  # Stock news
            "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",      # Markets
        ]
        cutoff = datetime.now() - timedelta(days=NEWS_FETCH_DAYS)

        for feed_url in feeds:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries:
                title_lower = entry.title.lower()
                sym_lower = symbol.lower()

                # Only include if article mentions this stock
                if sym_lower not in title_lower and sym_lower[:5] not in title_lower:
                    continue

                try:
                    pub_date = datetime(*entry.published_parsed[:6])
                    if pub_date < cutoff:
                        continue
                    articles.append({
                        "title":     entry.title,
                        "source":    "Economic Times",
                        "url":       entry.link,
                        "published": pub_date.strftime("%d %b %H:%M"),
                        "summary":   entry.get("summary", "")[:300],
                    })
                except:
                    continue

            if articles:
                break

    except Exception as e:
        logger.debug(f"ET RSS error for {symbol}: {e}")
    return articles


def deduplicate_news(articles: list) -> list:
    """Remove duplicate articles by title similarity."""
    seen_titles = set()
    unique = []
    for article in articles:
        # Normalize title for comparison
        normalized = article["title"].lower()[:60]
        if normalized not in seen_titles:
            seen_titles.add(normalized)
            unique.append(article)
    return unique


def fetch_stock_news(symbol: str, company_name: str = "") -> list:
    """
    Master news fetcher — combines multiple sources and deduplicates.
    Returns top N articles sorted by freshness.
    """
    all_articles = []
    yf_symbol = f"{symbol}.NS"

    # Source 1: Yahoo Finance (most reliable for NSE stocks)
    yahoo_articles = fetch_yahoo_news(symbol, yf_symbol)
    all_articles.extend(yahoo_articles)
    logger.debug(f"  {symbol} Yahoo: {len(yahoo_articles)} articles")

    # Source 2: Google News RSS
    if company_name:
        google_articles = fetch_google_news_rss(company_name, symbol)
        all_articles.extend(google_articles)
        logger.debug(f"  {symbol} Google: {len(google_articles)} articles")

    # Source 3: Economic Times RSS
    et_articles = fetch_et_rss(symbol)
    all_articles.extend(et_articles)
    logger.debug(f"  {symbol} ET: {len(et_articles)} articles")

    # Deduplicate and return top N
    unique = deduplicate_news(all_articles)
    return unique[:MAX_NEWS_PER_STOCK]
