import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, forbidden, audit } from '@/lib/guard';
import { ctlError, ctlOnBackup, validBackupId } from '@/lib/minecraft';

// Remet une sauvegarde en place (le monde actuel est sauvegardé avant). Si elle
// vient d'un autre modpack, le serveur bascule aussi sur ce modpack.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  const { id } = await req.json().catch(() => ({}));
  if (!validBackupId(id)) return NextResponse.json({ error: 'Invalid backup id' }, { status: 400 });
  try {
    await ctlOnBackup('restore-world', id);
    audit('minecraft', `restore-world ${id}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: ctlError(e, 'Restore failed') }, { status: 500 });
  }
}
