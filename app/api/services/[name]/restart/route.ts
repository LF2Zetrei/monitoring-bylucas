import { NextRequest, NextResponse } from 'next/server';
import { isKnownAppService, isKnownInfraService } from '@/lib/manifest';
import { execFile } from '@/lib/exec';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  // On ne redémarre JAMAIS un nom qui n'est pas explicitement dans un des
  // deux manifestes - empêche toute tentative de redémarrer un service
  // arbitraire du système, même par erreur d'interface.
  if (!isKnownAppService(name) && !isKnownInfraService(name)) {
    return NextResponse.json({ error: 'Service inconnu' }, { status: 404 });
  }

  try {
    await execFile('sudo', ['/usr/bin/systemctl', 'restart', name]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Échec du redémarrage' }, { status: 500 });
  }
}
