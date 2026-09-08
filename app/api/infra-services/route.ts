import { NextResponse } from 'next/server';
import { getInfra } from '@/lib/manifest';
import { isServiceActive, getContainerStatus } from '@/lib/exec';

export async function GET() {
  const { infra_services, docker_containers } = getInfra();

  const services = await Promise.all(
    infra_services.map(async (name) => ({
      name,
      kind: 'systemd' as const,
      status: await isServiceActive(name),
    }))
  );

  const containers = await Promise.all(
    docker_containers.map(async (name) => ({
      name,
      kind: 'docker' as const,
      status: await getContainerStatus(name),
    }))
  );

  return NextResponse.json([...services, ...containers]);
}
