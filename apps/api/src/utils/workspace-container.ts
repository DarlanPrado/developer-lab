import type { EnvVariable, WorkspaceContainer } from '@developer-lab/shared';
import type { workspaceContainers } from '@developer-lab/db/schema';

type WorkspaceContainerRow = typeof workspaceContainers.$inferSelect;

export function parseContainerEnv(raw: string | null | undefined): EnvVariable[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as EnvVariable[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeContainerEnv(env: EnvVariable[]): string {
  return JSON.stringify(env);
}

export function sanitizeWorkspaceContainer(row: WorkspaceContainerRow): WorkspaceContainer {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    image: row.image,
    port: row.port,
    exposeViaTraefik: Boolean(row.exposeViaTraefik),
    isPrimary: Boolean(row.isPrimary),
    containerId: row.containerId,
    status: row.status,
    env: parseContainerEnv(row.env),
    cpuLimit: row.cpuLimit,
    memoryLimit: row.memoryLimit,
    order: row.order,
  };
}
