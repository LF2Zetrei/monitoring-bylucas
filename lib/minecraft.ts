import fs from 'fs';
import { execFile } from './exec';

export const CONTAINER = 'homestead';
export const CONFIG_PATH = '/var/lib/minecraft-panel/config.json';
export const REQUEST_PATH = '/var/lib/minecraft-panel/request.json';
export const UPLOAD_PATH = '/var/minecraft-uploads/incoming.zip';
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024; // 4 Go

export type McConfig = { slug: string; fileId: string };

export type Backup = {
  id: string; // "<slug>/<AAAAMMJJ-HHMMSS>"
  slug: string;
  fileId: string;
  reason: string;
  createdAt: string;
  size: number;
};

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

// Mêmes règles que read_request dans minecraft-ctl.
export function validBackupId(id: unknown): id is string {
  return typeof id === 'string' && /^([a-z0-9][a-z0-9-]{0,79}|unknown)\/[0-9]{8}-[0-9]{6}$/.test(id);
}

type CtlCommand =
  | 'start' | 'stop' | 'restart' | 'apply' | 'apply-clean' | 'import-world'
  | 'new-world' | 'save-world' | 'list-backups' | 'restore-world' | 'delete-backup';

// sudo + sous-commande fixe : correspond exactement aux règles sudoers.
export async function ctl(sub: CtlCommand) {
  return execFile('sudo', ['/usr/local/sbin/minecraft-ctl', sub], { timeout: 10 * 60 * 1000 });
}

// restore-world / delete-backup ne prennent pas d'argument (sudoers) : la
// sauvegarde visée passe par un fichier, revalidé côté root.
export async function ctlOnBackup(sub: 'restore-world' | 'delete-backup', id: string) {
  fs.writeFileSync(REQUEST_PATH, JSON.stringify({ id }), { mode: 0o600 });
  return ctl(sub);
}

// Dernière ligne de stderr de minecraft-ctl (messages prévus pour l'interface).
export function ctlError(e: unknown, fallback: string): string {
  const stderr = String((e as { stderr?: string })?.stderr ?? '').trim();
  return stderr.split('\n').pop() || fallback;
}

export async function listBackups(): Promise<Backup[]> {
  const { stdout } = await ctl('list-backups');
  return JSON.parse(stdout);
}

// Commande serveur via RCON. Pas de shell : la commande est un seul argument.
export async function rcon(command: string): Promise<string> {
  const { stdout } = await execFile('docker', ['exec', CONTAINER, 'rcon-cli', command], { timeout: 15000 });
  return stdout.replace(/§./g, '').trim();
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
