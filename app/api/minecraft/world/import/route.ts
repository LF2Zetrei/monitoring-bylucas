import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, forbidden, audit } from '@/lib/guard';
import { ctl, ctlError } from '@/lib/minecraft';

// Étape 2 : valide le zip, arrête le serveur, sauvegarde l'ancien monde
// (voir /api/minecraft/backups), remplace, redémarre.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  try {
    await ctl('import-world');
    audit('minecraft', 'import-world');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: ctlError(e, 'Import failed') }, { status: 400 });
  }
}
