import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { audit } from '@/lib/guard';

export const dynamic = 'force-dynamic';

// Le zip est produit à la volée et envoyé au navigateur sans passer par le disque.
export async function GET() {
  const child = spawn('sudo', ['/usr/local/sbin/minecraft-ctl', 'export-world'], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  audit('minecraft', 'download-world');
  const stamp = new Date().toISOString().slice(0, 10);
  const stream = Readable.toWeb(child.stdout) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="homestead-world-${stamp}.zip"`,
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
