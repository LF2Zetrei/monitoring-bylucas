import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { sameOrigin, forbidden, audit } from '@/lib/guard';
import { CONFIG_PATH, ctl, ctlError, validConfig } from '@/lib/minecraft';

// Enregistre le nouveau modpack puis recrée le conteneur (le monde est conservé).
// clean=true : sauvegarde le monde puis supprime mods/ et config/ (recommandé
// quand on change de modpack, sinon les anciens mods restent).
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  const body = await req.json().catch(() => ({}));
  const { slug, fileId = '', clean = false } = body;
  if (!validConfig(slug, fileId)) {
    return NextResponse.json({ error: 'Invalid slug or file ID' }, { status: 400 });
  }
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ slug, fileId: String(fileId) }), { mode: 0o600 });
    await ctl(clean ? 'apply-clean' : 'apply');
    audit('minecraft', `modpack slug=${slug} fileId=${fileId} clean=${clean}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: ctlError(e, 'Failed to change modpack') }, { status: 500 });
  }
}
