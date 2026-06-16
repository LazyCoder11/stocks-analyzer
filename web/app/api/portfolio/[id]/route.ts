import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

type Params = {
  params: Promise<{ id: string }>;
};

// PUT: Update an existing stock
export async function PUT(req: Request, { params }: Params) {
  try {
    const sessionUser = getUserFromRequest(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    // Verify ownership
    const existing = await query(
      'SELECT id, symbol, exchange, company_name, quantity, buy_price, sector, notes FROM portfolio WHERE id = %s AND user_id = %s;',
      [id, sessionUser.userId]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    const s = existing[0];
    const symbol = String(data.symbol || s.symbol).trim().toUpperCase();
    const exchange = String(data.exchange || s.exchange).trim().toUpperCase();
    const yfSym = exchange === 'NSE' ? `${symbol}.NS` : `${symbol}.BO`;
    const companyName = String(data.company_name !== undefined ? data.company_name : s.company_name).trim();
    const quantity = parseFloat(data.quantity !== undefined ? data.quantity : s.quantity);
    const buyPrice = parseFloat(data.buy_price !== undefined ? data.buy_price : s.buy_price);
    const sector = String(data.sector !== undefined ? data.sector : s.sector).trim();
    const notes = String(data.notes !== undefined ? data.notes : s.notes).trim();

    await query(
      `UPDATE portfolio 
       SET symbol = %s, yf_symbol = %s, company_name = %s, quantity = %s, buy_price = %s, exchange = %s, sector = %s, notes = %s
       WHERE id = %s AND user_id = %s;`,
      [symbol, yfSym, companyName, quantity, buyPrice, exchange, sector, notes, id, sessionUser.userId]
    );

    return NextResponse.json({
      id,
      symbol,
      yf_symbol: yfSym,
      company_name: companyName,
      quantity,
      buy_price: buyPrice,
      exchange,
      sector,
      notes,
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove a stock
export async function DELETE(req: Request, { params }: Params) {
  try {
    const sessionUser = getUserFromRequest(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership and delete
    const result = await query(
      'DELETE FROM portfolio WHERE id = %s AND user_id = %s;',
      [id, sessionUser.userId]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting stock:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
