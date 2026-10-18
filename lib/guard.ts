import { NextRequest, NextResponse } from 'next/server';

// Protection CSRF : une requête qui modifie quelque chose doit venir de notre
// propre page (Origin == Host). Le basic auth est envoyé automatiquement par le
// navigateur, donc sans ce contrôle un site tiers pourrait déclencher une action.
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function forbidden() {
  return NextResponse.json({ error: 'Origine refusée' }, { status: 403 });
}

// Journal d'audit : part dans journalctl -u monitoring.
export function audit(action: string, detail = '') {
  console.log(`[audit] ${new Date().toISOString()} ${action} ${detail}`.trim());
}
