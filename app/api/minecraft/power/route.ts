import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, forbidden, audit } from '@/lib/guard';
import { ctl } from '@/lib/minecraft';

const ACTIONS = ['start', 'stop', 'restart'] as const;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  const { action } = await req.json().catch(() => ({}));
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  try {
    await ctl(action);
    audit('minecraft', action);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: `Échec : ${action}` }, { status: 500 });
  }
}
