import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

type Params = {
  params: Promise<{ symbol: string }>;
};

export async function GET(req: Request, { params }: Params) {
  try {
    const sessionUser = getUserFromRequest(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol } = await params;
    const { searchParams } = new URL(req.url);
    const exchange = searchParams.get('exchange') || 'NSE';

    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000';

    // Call Python Flask lookup
    const res = await fetch(`${backendUrl}/api/lookup/${symbol}?exchange=${exchange}`);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Symbol lookup failed' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Lookup route error:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with lookup service. Please check if it is running.' },
      { status: 500 }
    );
  }
}
