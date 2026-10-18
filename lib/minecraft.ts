import fs from 'fs';
import { execFile } from './exec';

export const CONTAINER = 'homestead';
export const CONFIG_PATH = '/var/lib/minecraft-panel/config.json';
export const UPLOAD_PATH = '/var/minecraft-uploads/incoming.zip';
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024; // 4 Go

export type McConfig = { slug: string; fileId: string };

export function readConfig(): McConfig {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return { slug: String(c.slug ?? ''), fileId: String(c.fileId ?? '') };
  } catch {
    return { slug: '', fileId: '' };
  }
}

export function validConfig(slug: unknown, fileId: unknown): slug is string {
  return (
    typeof slug === 'string' &&
    /^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) &&
    (fileId === '' || fileId === undefined || /^[0-9]{1,10}$/.test(String(fileId)))
  );
}

// sudo + sous-commande fixe : correspond exactement aux règles sudoers.
export async function ctl(sub: 'start' | 'stop' | 'restart' | 'apply' | 'apply-clean' | 'import-world') {
  return execFile('sudo', ['/usr/local/sbin/minecraft-ctl', sub], { timeout: 10 * 60 * 1000 });
}

async function dockerOut(args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFile('docker', args, { timeout: 8000 });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function getStatus() {
  const state = await dockerOut(['inspect', '-f', '{{.State.Status}}|{{.State.Health.Status}}|{{.State.StartedAt}}', CONTAINER]);
  if (!state) return { status: 'absent', health: null, startedAt: null, memory: null, players: null, runningSlug: null };
  const [status, health, startedAt] = state.split('|');
  let memory: string | null = null;
  let players: string | null = null;
  if (status === 'running') {
    memory = await dockerOut(['stats', '--no-stream', '--format', '{{.MemUsage}}', CONTAINER]);
    const list = await dockerOut(['exec', CONTAINER, 'rcon-cli', 'list']);
    const m = list?.match(/There are (\d+) of a max of (\d+)/);
    players = m ? `${m[1]} / ${m[2]}` : null;
  }
  const env = await dockerOut(['inspect', '-f', '{{range .Config.Env}}{{println .}}{{end}}', CONTAINER]);
  const runningSlug = env?.match(/^CF_SLUG=(.*)$/m)?.[1] ?? null;
  return { status, health: health && health !== '<no value>' ? health : null, startedAt, memory, players, runningSlug };
}
