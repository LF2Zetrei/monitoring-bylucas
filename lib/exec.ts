import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

// promisify + execFile (pas exec) : les arguments sont passés séparément au
// process, jamais interpolés dans une chaîne shell - élimine tout risque
// d'injection de commande, même si un nom de service contenait un caractère
// inattendu.
export const execFile = promisify(execFileCb);

export async function isServiceActive(name: string): Promise<string> {
  try {
    const { stdout } = await execFile('systemctl', ['is-active', name]);
    return stdout.trim();
  } catch {
    return 'inactive';
  }
}

export async function getServiceMemory(name: string): Promise<number | null> {
  try {
    const { stdout } = await execFile('systemctl', [
      'show',
      name,
      '--property=MemoryCurrent',
    ]);
    const match = stdout.match(/MemoryCurrent=(\d+)/);
    if (!match || match[1] === '18446744073709551615') return null; // "[not set]"
    return Math.round(parseInt(match[1], 10) / (1024 * 1024)); // Mo
  } catch {
    return null;
  }
}

export async function getContainerStatus(name: string): Promise<string> {
  try {
    const { stdout } = await execFile('docker', [
      'inspect',
      '--format',
      '{{.State.Status}}',
      name,
    ]);
    return stdout.trim();
  } catch {
    return 'not found';
  }
}

export function certificateExists(domain: string): boolean {
  return fs.existsSync(`/etc/letsencrypt/live/${domain}/fullchain.pem`);
}
