import { NextResponse } from 'next/server';
import { getServices } from '@/lib/manifest';
import { isServiceActive, getServiceMemory, certificateExists } from '@/lib/exec';

export async function GET() {
  const services = getServices();

  const results = await Promise.all(
    services.map(async (s) => {
      if (s.type === 'static') {
        return {
          ...s,
          status: 'active' as const,
          memoryMB: null,
          certExists: s.subdomain ? certificateExists(s.subdomain) : null,
        };
      }
      const [status, memoryMB] = await Promise.all([
        isServiceActive(s.name),
        getServiceMemory(s.name),
      ]);
      return {
        ...s,
        status,
        memoryMB,
        certExists: s.subdomain ? certificateExists(s.subdomain) : null,
      };
    })
  );

  return NextResponse.json(results);
}
