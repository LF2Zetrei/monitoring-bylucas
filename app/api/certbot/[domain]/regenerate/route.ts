import { NextResponse } from 'next/server';
import { isKnownSubdomain } from '@/lib/manifest';
import { certificateExists, execFile } from '@/lib/exec';

const CERTBOT_EMAIL = process.env.CERTBOT_EMAIL || '';

export async function POST(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;

  if (!isKnownSubdomain(domain)) {
    return NextResponse.json({ error: 'Domaine inconnu' }, { status: 404 });
  }

  try {
    if (certificateExists(domain)) {
      // Le certificat existe déjà sur le disque, mais la config nginx a
      // perdu ses blocs HTTPS (le bug qu'on a vécu plusieurs fois) - on
      // réinstalle le certificat existant, pas besoin de le redemander.
      await execFile('sudo', ['/usr/bin/certbot', 'install', '--nginx', '--cert-name', domain]);
    } else {
      // Aucun certificat n'existe encore pour ce domaine - premier
      // émission complète.
      await execFile('sudo', [
        '/usr/bin/certbot',
        '--nginx',
        '-d',
        domain,
        '--non-interactive',
        '--agree-tos',
        '-m',
        CERTBOT_EMAIL,
        '--redirect',
      ]);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Échec de la génération du certificat' }, { status: 500 });
  }
}
