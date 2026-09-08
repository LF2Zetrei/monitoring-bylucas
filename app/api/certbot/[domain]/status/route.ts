import { NextResponse } from 'next/server';
import { isKnownSubdomain } from '@/lib/manifest';
import { certificateExists } from '@/lib/exec';

export async function GET(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;

  if (!isKnownSubdomain(domain)) {
    return NextResponse.json({ error: 'Domaine inconnu' }, { status: 404 });
  }

  return NextResponse.json({ exists: certificateExists(domain) });
}
