import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const sessionUser = getUserFromRequest(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { telegramChatId } = await req.json();

    await query('UPDATE users SET telegram_chat_id = %s WHERE id = %s;', [
      telegramChatId ? telegramChatId.trim() : null,
      sessionUser.userId,
    ]);

    return NextResponse.json({ message: 'Telegram Chat ID updated successfully' });
  } catch (error) {
    console.error('Update telegram ID error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
