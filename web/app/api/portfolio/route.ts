import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';
import crypto from 'crypto';

// GET all holdings for the current user (enriched with live prices)
export async function GET(req: Request) {
  try {
    const sessionUser = getUserFromRequest(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const holdings = await query(
      'SELECT id, symbol, yf_symbol, company_name, quantity, buy_price, exchange, sector, notes FROM portfolio WHERE user_id = %s;',
      [sessionUser.userId]
    );

    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000';

    // Fetch all cached live prices from Flask in one request
    let priceMap: Record<string, number> = {};
    try {
      const pricesRes = await fetch(`${backendUrl}/api/prices`, { cache: 'no-store' });
      if (pricesRes.ok) {
        const pricesData = await pricesRes.json();
        priceMap = pricesData.prices || {};
      }
    } catch (err) {
      console.error('Failed to fetch batch prices from Flask backend:', err);
    }

    // Enrich holdings using the cached priceMap
    const enriched = holdings.map((stock) => {
      const yfSym = stock.yf_symbol;
      const live = priceMap[yfSym] !== undefined ? priceMap[yfSym] : stock.buy_price;
      const pnl = (live - stock.buy_price) * stock.quantity;
      const pnlPct = stock.buy_price ? ((live - stock.buy_price) / stock.buy_price) * 100 : 0;

      return {
        ...stock,
        live_price: Math.round(live * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        pnl_pct: Math.round(pnlPct * 100) / 100,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Add a new stock to the portfolio
export async function POST(req: Request) {
  try {
    const sessionUser = getUserFromRequest(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const required = ['symbol', 'quantity', 'buy_price', 'exchange'];
    for (const field of required) {
      if (data[field] === undefined || data[field] === '' || data[field] === null) {
        return NextResponse.json({ error: `'${field}' is required` }, { status: 400 });
      }
    }

    const symbol = String(data.symbol).trim().toUpperCase();
    const exchange = String(data.exchange || 'NSE').trim().toUpperCase();
    const yfSym = exchange === 'NSE' ? `${symbol}.NS` : `${symbol}.BO`;

    // Check duplicate symbol for this user
    const duplicates = await query(
      'SELECT id FROM portfolio WHERE user_id = %s AND symbol = %s;',
      [sessionUser.userId, symbol]
    );
    if (duplicates.length > 0) {
      return NextResponse.json(
        { error: `${symbol} already exists in your portfolio. Use Edit to update it.` },
        { status: 409 }
      );
    }

    const entryId = crypto.randomUUID();
    const companyName = String(data.company_name || symbol).trim() || symbol;
    const quantity = parseFloat(data.quantity);
    const buyPrice = parseFloat(data.buy_price);
    const sector = String(data.sector || '').trim();
    const notes = String(data.notes || '').trim();

    await query(
      `INSERT INTO portfolio (id, user_id, symbol, yf_symbol, company_name, quantity, buy_price, exchange, sector, notes)
       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);`,
      [entryId, sessionUser.userId, symbol, yfSym, companyName, quantity, buyPrice, exchange, sector, notes]
    );

    return NextResponse.json(
      {
        id: entryId,
        symbol,
        yf_symbol: yfSym,
        company_name: companyName,
        quantity,
        buy_price: buyPrice,
        exchange,
        sector,
        notes,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding stock:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
