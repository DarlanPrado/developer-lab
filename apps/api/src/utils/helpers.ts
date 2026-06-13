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

export function buildTraefikLabels(key: string, port: number, domain: string) {
  return {
    'traefik.enable': 'true',
    [`traefik.http.routers.${key}.rule`]: `Host(\`${key}.${domain}\`)`,
    [`traefik.http.services.${key}.loadbalancer.server.port`]: String(port),
    'traefik.docker.network': 'lab-shared',
  };
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
