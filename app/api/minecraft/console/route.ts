import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, forbidden, audit } from '@/lib/guard';
import { rcon } from '@/lib/minecraft';

const MAX_LENGTH = 256;

// Commence par une lettre (jamais une option "-x" pour rcon-cli), une seule
// ligne, pas de caractère de contrôle.
function validCommand(cmd: string) {
  return (
    cmd.length > 0 &&
    cmd.length <= MAX_LENGTH &&
    /^[a-z]/i.test(cmd) &&
    [...cmd].every((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
  );
}

// Console : exécute une commande serveur via RCON et renvoie sa sortie.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  const { command } = await req.json().catch(() => ({}));
  const cmd = typeof command === 'string' ? command.trim().replace(/^\//, '') : '';
  if (!validCommand(cmd)) return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
  try {
    const output = await rcon(cmd);
    audit('minecraft', `console ${cmd}`);
    return NextResponse.json({ output });
  } catch {
    return NextResponse.json({ error: 'Server unreachable (is it running?)' }, { status: 502 });
  }
}
