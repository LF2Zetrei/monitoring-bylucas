import fs from 'fs';
import { NextResponse } from 'next/server';
import { execFile } from '@/lib/exec';

export async function GET() {
  const meminfo = fs.readFileSync('/proc/meminfo', 'utf-8');
  const totalKB = parseInt(meminfo.match(/MemTotal:\s+(\d+)/)?.[1] || '0', 10);
  const availableKB = parseInt(meminfo.match(/MemAvailable:\s+(\d+)/)?.[1] || '0', 10);
  const usedPercent = totalKB > 0 ? Math.round(((totalKB - availableKB) / totalKB) * 100) : 0;

  let diskPercent = 0;
  try {
    const { stdout } = await execFile('df', ['--output=pcent', '/']);
    diskPercent = parseInt(stdout.trim().split('\n')[1]?.replace('%', '') || '0', 10);
  } catch {
    // valeur par défaut à 0 si df échoue pour une raison quelconque
  }

  return NextResponse.json({
    ramPercent: usedPercent,
    ramTotalMB: Math.round(totalKB / 1024),
    diskPercent,
  });
}
