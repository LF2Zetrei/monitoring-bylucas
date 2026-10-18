import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, forbidden, audit } from '@/lib/guard';
import { ctlError, ctlOnBackup, validBackupId } from '@/lib/minecraft';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  const { id } = await req.json().catch(() => ({}));
  if (!validBackupId(id)) return NextResponse.json({ error: 'Invalid backup id' }, { status: 400 });
  try {
    await ctlOnBackup('delete-backup', id);
    audit('minecraft', `delete-backup ${id}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: ctlError(e, 'Delete failed') }, { status: 500 });
  }
}
