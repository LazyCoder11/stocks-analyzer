import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const sessionUser = getUserFromRequest(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const session = body.session || 'morning';

    // Retrieve telegram_chat_id for current user
    const users = await query('SELECT telegram_chat_id FROM users WHERE id = %s;', [sessionUser.userId]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chatId = users[0].telegram_chat_id;
    if (!chatId) {
      return NextResponse.json(
        { error: 'Telegram Chat ID not configured. Please set your Telegram Chat ID in the sidebar first.' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5000';

    // Forward manual trigger to Flask API
    const res = await fetch(`${backendUrl}/api/run-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session,
        user_id: sessionUser.userId,
        chat_id: chatId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Failed to trigger analysis' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error triggering analysis:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with Python analysis server. Please check if it is running.' },
      { status: 500 }
    );
  }
}
