import { eq } from 'drizzle-orm';
import { workspaces } from '@developer-lab/db/schema';
import type { FastifyInstance } from 'fastify';
import type { createDockerService } from './docker.service.js';
import { withTimeout } from '../utils/helpers.js';

type WorkspaceRow = typeof workspaces.$inferSelect;

export async function reconcileWorkspaceContainer(
  fastify: FastifyInstance,
  dockerService: ReturnType<typeof createDockerService>,
  workspace: WorkspaceRow,
) {
  if (workspace.containerId) {
    const runtimeStatus = await dockerService.getContainerRuntimeStatus(workspace.containerId);
    if (runtimeStatus) {
      if (runtimeStatus === workspace.status) {
        return workspace;
      }

      await fastify.db
        .update(workspaces)
        .set({ status: runtimeStatus })
        .where(eq(workspaces.id, workspace.id));

      return { ...workspace, status: runtimeStatus };
    }
  }

  try {
    const container = await withTimeout(
      dockerService.ensureWorkspaceContainer(workspace),
      15_000,
      'Docker container provisioning timed out',
    );

    const runtimeStatus = await dockerService.getContainerRuntimeStatus(container.id);
    const status = runtimeStatus ?? 'stopped';
    const updates: Partial<WorkspaceRow> = {};

    if (container.id !== workspace.containerId) {
      updates.containerId = container.id;
    }

    if (status !== workspace.status) {
      updates.status = status;
    }

    if (Object.keys(updates).length > 0) {
      await fastify.db
        .update(workspaces)
        .set(updates)
        .where(eq(workspaces.id, workspace.id));
    }

    return { ...workspace, containerId: container.id, status };
  } catch (error) {
    fastify.log.warn({ err: error, workspaceId: workspace.id }, 'Failed to reconcile workspace container');
    return workspace;
  }
}
