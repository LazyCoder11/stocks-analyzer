import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const sessionUser = getUserFromRequest(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's stock symbols
    const stocks = await query(
      'SELECT yf_symbol FROM portfolio WHERE user_id = %s LIMIT 5;',
      [sessionUser.userId]
    );

    let symbols = '^NSEI'; // Fallback to Nifty 50 index news
    if (stocks.length > 0) {
      symbols = stocks.map((s: any) => s.yf_symbol).join(',');
    }

    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000';
    const res = await fetch(`${backendUrl}/api/news?symbols=${encodeURIComponent(symbols)}`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: res.status });
    }

    const newsData = await res.json();
    return NextResponse.json(newsData);
  } catch (error) {
    console.error('Error in news route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
