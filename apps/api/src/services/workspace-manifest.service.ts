import type { CreateWorkspaceContainerRequest, EnvVariable } from '@developer-lab/shared';

export interface ManifestServiceDefinition {
  name: string;
  image: string;
  port?: number | null;
  primary?: boolean;
  expose?: boolean;
  env?: EnvVariable[];
  order?: number;
  cpuLimit?: number | null;
  memoryLimit?: number | null;
}

function parseEnvLine(line: string): EnvVariable | null {
  const trimmed = line.trim().replace(/^-\s*/, '');
  const index = trimmed.indexOf('=');

  if (index <= 0) return null;

  return {
    key: trimmed.slice(0, index).trim(),
    value: trimmed.slice(index + 1).trim(),
  };
}

function parseEnvBlock(lines: string[], startIndex: number) {
  const env: EnvVariable[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) break;
    if (!/^\s/.test(line) && !line.trim().startsWith('-')) break;

    const parsed = parseEnvLine(line);
    if (parsed) env.push(parsed);
    index += 1;
  }

  return { env, nextIndex: index };
}

export function parseWorkspaceManifest(manifest: string): ManifestServiceDefinition[] {
  const lines = manifest.split('\n');
  const services: ManifestServiceDefinition[] = [];
  let current: ManifestServiceDefinition | null = null;
  let index = 0;
  let inServicesBlock = false;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      index += 1;
      continue;
    }

    if (trimmed === 'services:') {
      inServicesBlock = true;
      index += 1;
      continue;
    }

    const serviceMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*$/);
    const isServiceHeader = Boolean(serviceMatch) && (inServicesBlock ? line.startsWith('  ') && !line.startsWith('    ') : !line.startsWith(' '));

    if (serviceMatch && isServiceHeader) {
      if (current) services.push(current);
      current = {
        name: serviceMatch[1],
        image: 'node:22-alpine',
        order: services.length,
      };
      index += 1;
      continue;
    }

    if (!current) {
      index += 1;
      continue;
    }

    const imageMatch = trimmed.match(/^image:\s*(.+)$/);
    if (imageMatch) {
      current.image = imageMatch[1].trim();
      index += 1;
      continue;
    }

    const portMatch = trimmed.match(/^port:\s*(\d+)$/);
    if (portMatch) {
      current.port = Number(portMatch[1]);
      index += 1;
      continue;
    }

    if (trimmed === 'primary: true') {
      current.primary = true;
      index += 1;
      continue;
    }

    if (trimmed === 'expose: true') {
      current.expose = true;
      index += 1;
      continue;
    }

    const orderMatch = trimmed.match(/^order:\s*(\d+)$/);
    if (orderMatch) {
      current.order = Number(orderMatch[1]);
      index += 1;
      continue;
    }

    if (trimmed === 'env:') {
      const parsed = parseEnvBlock(lines, index + 1);
      current.env = parsed.env;
      index = parsed.nextIndex;
      continue;
    }

    index += 1;
  }

  if (current) services.push(current);

  return services;
}

export function stringifyWorkspaceManifest(services: ManifestServiceDefinition[]): string {
  const blocks = services.map((service) => {
    const lines = [`${service.name}:`, `  image: ${service.image}`];

    if (service.primary) lines.push('  primary: true');
    if (service.expose) lines.push('  expose: true');
    if (service.port) lines.push(`  port: ${service.port}`);
    if (service.order !== undefined) lines.push(`  order: ${service.order}`);

    if (service.env?.length) {
      lines.push('  env:');
      for (const item of service.env) {
        lines.push(`    - ${item.key}=${item.value}`);
      }
    }

    return lines.join('\n');
  });

  return `services:\n${blocks.map((block) => block.replace(/^/gm, '  ')).join('\n')}`;
}

export function manifestToContainerRequests(
  services: ManifestServiceDefinition[],
): CreateWorkspaceContainerRequest[] {
  return services.map((service, index) => ({
    name: service.name,
    image: service.image,
    port: service.port ?? null,
    exposeViaTraefik: Boolean(service.expose),
    isPrimary: Boolean(service.primary),
    env: service.env ?? [],
    cpuLimit: service.cpuLimit ?? null,
    memoryLimit: service.memoryLimit ?? null,
    order: service.order ?? index,
  }));
}

export function containersToManifest(
  containers: Array<{
    name: string;
    image: string;
    port: number | null;
    exposeViaTraefik: boolean;
    isPrimary: boolean;
    env: EnvVariable[];
    order: number;
  }>,
): string {
  return stringifyWorkspaceManifest(
    containers.map((container) => ({
      name: container.name,
      image: container.image,
      port: container.port,
      primary: container.isPrimary,
      expose: container.exposeViaTraefik,
      env: container.env,
      order: container.order,
    })),
  );
}
