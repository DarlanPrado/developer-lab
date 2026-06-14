import { asc, eq } from 'drizzle-orm';
import { workspaceContainers, workspaces } from '@developer-lab/db/schema';
import type { WorkspaceContainerStatus, WorkspaceStatus } from '@developer-lab/shared';
import type { FastifyInstance } from 'fastify';
import type { createDockerService } from './docker.service.js';
import {
  parseContainerEnv,
  sanitizeWorkspaceContainer,
  serializeContainerEnv,
} from '../utils/workspace-container.js';
import { containersToManifest } from './workspace-manifest.service.js';
import { createId, withTimeout } from '../utils/helpers.js';

type WorkspaceRow = typeof workspaces.$inferSelect;
type WorkspaceContainerRow = typeof workspaceContainers.$inferSelect;
type DockerService = ReturnType<typeof createDockerService>;

function mapRuntimeStatus(status: WorkspaceStatus | null): WorkspaceContainerStatus {
  if (status === 'running') return 'running';
  if (status === 'error') return 'error';
  return 'stopped';
}

function aggregateWorkspaceStatus(
  containers: Array<{ isPrimary: boolean; status: WorkspaceContainerStatus }>,
): WorkspaceStatus {
  if (containers.some((container) => container.status === 'error')) {
    return 'error';
  }

  const primary = containers.find((container) => container.isPrimary) ?? containers[0];
  if (primary?.status === 'running') {
    return 'running';
  }

  if (containers.some((container) => container.status === 'running')) {
    return 'running';
  }

  return 'stopped';
}

export async function ensureLegacyWorkspaceContainer(
  fastify: FastifyInstance,
  workspace: WorkspaceRow,
) {
  const existing = await fastify.db.query.workspaceContainers.findMany({
    where: eq(workspaceContainers.workspaceId, workspace.id),
  });

  if (existing.length > 0) {
    return existing;
  }

  const legacyName = 'app';
  const row: WorkspaceContainerRow = {
    id: createId(),
    workspaceId: workspace.id,
    name: legacyName,
    image: workspace.image ?? 'node:22-alpine',
    port: workspace.port ?? 3000,
    exposeViaTraefik: true,
    isPrimary: true,
    containerId: workspace.containerId,
    status: workspace.status === 'running' ? 'running' : workspace.status === 'error' ? 'error' : 'stopped',
    env: null,
    cpuLimit: workspace.cpuLimit,
    memoryLimit: workspace.memoryLimit,
    order: 0,
  };

  await fastify.db.insert(workspaceContainers).values(row);

  const manifest = containersToManifest([
    {
      name: row.name,
      image: row.image,
      port: row.port,
      exposeViaTraefik: true,
      isPrimary: true,
      env: [],
      order: 0,
    },
  ]);

  await fastify.db
    .update(workspaces)
    .set({ manifest })
    .where(eq(workspaces.id, workspace.id));

  return [row];
}

export async function reconcileWorkspaceContainer(
  fastify: FastifyInstance,
  dockerService: DockerService,
  workspace: WorkspaceRow,
) {
  const synced = await reconcileWorkspaceContainers(fastify, dockerService, workspace);
  const primary = synced.containers.find((container) => container.isPrimary) ?? synced.containers[0];

  return {
    ...synced.workspace,
    containerId: primary?.containerId ?? synced.workspace.containerId,
  };
}

export async function reconcileWorkspaceContainers(
  fastify: FastifyInstance,
  dockerService: DockerService,
  workspace: WorkspaceRow,
) {
  await ensureLegacyWorkspaceContainer(fastify, workspace);

  const rows = await fastify.db.query.workspaceContainers.findMany({
    where: eq(workspaceContainers.workspaceId, workspace.id),
    orderBy: [asc(workspaceContainers.order), asc(workspaceContainers.name)],
  });

  const syncedRows: WorkspaceContainerRow[] = [];

  for (const row of rows) {
    let containerId = row.containerId;
    let status = row.status;

    if (containerId) {
      const runtimeStatus = await dockerService.getContainerRuntimeStatus(containerId);
      if (runtimeStatus) {
        status = mapRuntimeStatus(runtimeStatus);
      } else {
        containerId = null;
      }
    }

    if (!containerId) {
      try {
        const container = await withTimeout(
          dockerService.ensureSubContainer({
            workspaceKey: workspace.key,
            containerName: row.name,
            image: row.image,
            port: row.port,
            exposeViaTraefik: Boolean(row.exposeViaTraefik),
            env: parseContainerEnv(row.env).map((item) => `${item.key}=${item.value}`),
            cpuLimit: row.cpuLimit,
            memoryLimit: row.memoryLimit,
          }),
          15_000,
          'Docker container provisioning timed out',
        );

        containerId = container.id;
        const runtimeStatus = await dockerService.getContainerRuntimeStatus(container.id);
        status = mapRuntimeStatus(runtimeStatus);
      } catch (error) {
        fastify.log.warn(
          { err: error, workspaceId: workspace.id, containerName: row.name },
          'Failed to reconcile workspace container',
        );
        status = 'error';
      }
    }

    if (containerId !== row.containerId || status !== row.status) {
      await fastify.db
        .update(workspaceContainers)
        .set({ containerId, status })
        .where(eq(workspaceContainers.id, row.id));
    }

    syncedRows.push({ ...row, containerId, status });
  }

  const sanitized = syncedRows.map(sanitizeWorkspaceContainer);
  const workspaceStatus = aggregateWorkspaceStatus(sanitized);
  const primary = sanitized.find((container) => container.isPrimary) ?? sanitized[0];

  const workspaceUpdates: Partial<WorkspaceRow> = {};
  if (workspaceStatus !== workspace.status) {
    workspaceUpdates.status = workspaceStatus;
  }
  if (primary?.containerId && primary.containerId !== workspace.containerId) {
    workspaceUpdates.containerId = primary.containerId;
  }

  if (Object.keys(workspaceUpdates).length > 0) {
    await fastify.db
      .update(workspaces)
      .set(workspaceUpdates)
      .where(eq(workspaces.id, workspace.id));
  }

  return {
    workspace: {
      ...workspace,
      ...workspaceUpdates,
    },
    containers: sanitized,
  };
}

export async function syncWorkspaceManifest(
  fastify: FastifyInstance,
  workspaceId: string,
) {
  const rows = await fastify.db.query.workspaceContainers.findMany({
    where: eq(workspaceContainers.workspaceId, workspaceId),
    orderBy: [asc(workspaceContainers.order), asc(workspaceContainers.name)],
  });

  const manifest = containersToManifest(
    rows.map((row) => ({
      name: row.name,
      image: row.image,
      port: row.port,
      exposeViaTraefik: Boolean(row.exposeViaTraefik),
      isPrimary: Boolean(row.isPrimary),
      env: parseContainerEnv(row.env),
      order: row.order,
    })),
  );

  await fastify.db
    .update(workspaces)
    .set({ manifest })
    .where(eq(workspaces.id, workspaceId));

  return manifest;
}

export function envVariablesToDockerEnv(env: Array<{ key: string; value: string }>) {
  return env.map((item) => `${item.key}=${item.value}`);
}

export { serializeContainerEnv, sanitizeWorkspaceContainer };
