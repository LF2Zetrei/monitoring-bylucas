import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, forbidden, audit } from '@/lib/guard';
import { ctl } from '@/lib/minecraft';

// Étape 2 : valide le zip, arrête le serveur, sauvegarde l'ancien monde
// (5 sauvegardes conservées dans /var/minecraft-backups), remplace, redémarre.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  try {
    await ctl('import-world');
    audit('minecraft', 'import-world');
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = String((e as { stderr?: string })?.stderr ?? '').trim().split('\n').pop() || 'Échec de l\'import';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
