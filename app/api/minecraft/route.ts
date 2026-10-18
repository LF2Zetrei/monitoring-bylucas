import { NextResponse } from 'next/server';
import { getStatus, readConfig } from '@/lib/minecraft';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ...(await getStatus()), config: readConfig() });
}
