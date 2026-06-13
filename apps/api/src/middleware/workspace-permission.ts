import type { AuthUser } from '@developer-lab/shared';
import { and, eq } from 'drizzle-orm';
import { workspaceMembers, workspaces } from '@developer-lab/db/schema';
import type { WorkspaceRole } from '@developer-lab/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { hasWorkspaceRole } from '../types.js';

export function requireWorkspaceRole(requiredRole: WorkspaceRole) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as { id?: string; key?: string };
    let workspaceId = params.id;

    if (!workspaceId && params.key) {
      const workspace = await request.server.db.query.workspaces.findFirst({
        where: eq(workspaces.key, params.key),
      });

      if (!workspace) {
        reply.status(404).send({ error: 'Workspace not found' });
        return;
      }

      workspaceId = workspace.id;
    }

    if (!workspaceId) {
      reply.status(400).send({ error: 'Workspace id required' });
      return;
    }

    if (!request.authUser) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const workspace = await request.server.db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      reply.status(404).send({ error: 'Workspace not found' });
      return;
    }

    if (workspace.ownerId === request.authUser.id) {
      return;
    }

    if (request.authUser.role === 'admin') {
      return;
    }

    const membership = await request.server.db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, request.authUser.id),
      ),
    });

    if (!membership || !hasWorkspaceRole(membership.role, requiredRole)) {
      reply.status(403).send({ error: 'Forbidden' });
    }
  };
}

export function requireWorkspaceRoleByKey(requiredRole: WorkspaceRole) {
  return requireWorkspaceRole(requiredRole);
}
