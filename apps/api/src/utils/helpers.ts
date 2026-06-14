import { nanoid } from 'nanoid';

export function createId() {
  return nanoid();
}

export function now() {
  return new Date();
}

export function slugify(value: string) {
  return value
   .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export function buildTraefikLabels(
  workspaceKey: string,
  serviceName: string,
  port: number,
  domain: string,
) {
  const routerKey = serviceName === 'app' || serviceName === 'main'
    ? workspaceKey
    : `${workspaceKey}-${serviceName}`;

  return {
    'traefik.enable': 'true',
    [`traefik.http.routers.${routerKey}.rule`]: `Host(\`${routerKey}.${domain}\`)`,
    [`traefik.http.services.${routerKey}.loadbalancer.server.port`]: String(port),
    'traefik.docker.network': 'lab-shared',
  };
}

export function buildWorkspaceContainerName(workspaceKey: string, containerName: string) {
  return containerName === 'app' || containerName === 'main'
    ? `lab-ws-${workspaceKey}`
    : `lab-ws-${workspaceKey}-${containerName}`;
}

export function buildEnvFromResource(
  name: string,
  endpoint: string,
  envPrefix?: string | null,
) {
  const prefix = envPrefix ?? name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return [
    { key: `${prefix}_URL`, value: endpoint },
    { key: `${prefix}_HOST`, value: endpoint.replace(/^https?:\/\//, '').split(':')[0] ?? endpoint },
  ];
}
