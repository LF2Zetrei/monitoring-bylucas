import fs from 'fs';

export type ServiceConfig = {
  name: string;
  type: 'node' | 'python' | 'rust' | 'springboot' | 'c' | 'static';
  path: string;
  subdomain?: string;
  port?: number;
};

export type InfraManifest = {
  infra_services: string[];
  docker_containers: string[];
};

export function getServices(): ServiceConfig[] {
  try {
    return JSON.parse(fs.readFileSync('/etc/services-manifest.json', 'utf-8'));
  } catch {
    return [];
  }
}

export function getInfra(): InfraManifest {
  try {
    return JSON.parse(fs.readFileSync('/etc/infra-manifest.json', 'utf-8'));
  } catch {
    return { infra_services: [], docker_containers: [] };
  }
}

// Un service applicatif "restartable" : tout sauf le statique, qui n'a pas de process.
export function isKnownAppService(name: string): boolean {
  return getServices().some((s) => s.name === name && s.type !== 'static');
}

export function isKnownInfraService(name: string): boolean {
  return getInfra().infra_services.includes(name);
}

export function isKnownContainer(name: string): boolean {
  return getInfra().docker_containers.includes(name);
}

// Un sous-domaine valide = déclaré dans un vrai projet, jamais une IP brute.
export function isKnownSubdomain(domain: string): boolean {
  return getServices().some((s) => s.subdomain === domain);
}
