import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, forbidden, audit } from '@/lib/guard';
import { ctl, ctlError } from '@/lib/minecraft';

// Sauvegarde le monde actuel, le supprime et redémarre : le serveur génère un
// nouveau monde avec une graine aléatoire (même modpack).
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  try {
    await ctl('new-world');
    audit('minecraft', 'new-world');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: ctlError(e, 'Failed to create a new world') }, { status: 500 });
  }
}
