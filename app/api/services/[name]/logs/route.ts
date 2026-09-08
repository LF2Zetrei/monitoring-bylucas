import { NextRequest, NextResponse } from 'next/server';
import { isKnownAppService, isKnownInfraService } from '@/lib/manifest';
import { execFile } from '@/lib/exec';

const VALID_LEVELS = ['emerg', 'alert', 'crit', 'err', 'warning', 'notice', 'info', 'debug'];

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  if (!isKnownAppService(name) && !isKnownInfraService(name)) {
    return NextResponse.json({ error: 'Service inconnu' }, { status: 404 });
  }

  const requestedLevel = req.nextUrl.searchParams.get('level') || 'info';
  const level = VALID_LEVELS.includes(requestedLevel) ? requestedLevel : 'info';

  try {
    const { stdout } = await execFile('journalctl', [
      '-u',
      name,
      '-p',
      level,
      '-n',
      '100',
      '--no-pager',
      '-o',
      'json',
    ]);

    const logs = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          const entry = JSON.parse(line);
          return {
            time: entry.__REALTIME_TIMESTAMP
              ? new Date(parseInt(entry.__REALTIME_TIMESTAMP, 10) / 1000).toISOString()
              : null,
            priority: entry.PRIORITY,
            message: entry.MESSAGE,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // plus récent en premier

    return NextResponse.json(logs);
  } catch {
    // journalctl retourne un code non-zéro s'il n'y a AUCUNE ligne au niveau
    // demandé - pas une vraie erreur, juste "rien à afficher".
    return NextResponse.json([]);
  }
}
