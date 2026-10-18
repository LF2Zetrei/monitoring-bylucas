import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, forbidden, audit } from '@/lib/guard';
import { ctl, ctlError, listBackups } from '@/lib/minecraft';

export const dynamic = 'force-dynamic';

// Sauvegardes du monde, rangées par modpack (/var/minecraft-backups/<slug>/).
export async function GET() {
  try {
    return NextResponse.json(await listBackups());
  } catch (e) {
    return NextResponse.json({ error: ctlError(e, 'Failed to list saved worlds') }, { status: 500 });
  }
}

// Sauvegarde manuelle (à chaud), jamais supprimée automatiquement.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  try {
    await ctl('save-world');
    audit('minecraft', 'save-world');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: ctlError(e, 'Failed to save the world') }, { status: 500 });
  }
}
