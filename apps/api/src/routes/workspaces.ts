import { and, eq } from 'drizzle-orm';
import {
  resources,
  users,
  workspaceDependencies,
  workspaceMembers,
  workspaces,
} from '@developer-lab/db/schema';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireWorkspaceRole } from '../middleware/workspace-permission.js';
import { createDockerService } from '../services/docker.service.js';
import { reconcileWorkspaceContainer } from '../services/workspace-container.service.js';
import { sanitizeUser } from '../types.js';
import { buildEnvFromResource, createId, now, slugify, withTimeout } from '../utils/helpers.js';

const createWorkspaceSchema = z.object({
  key: z.string().min(2).optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  visibility: z.enum(['public', 'restricted', 'key_only']).optional(),
  cpuLimit: z.number().positive().optional(),
  memoryLimit: z.number().int().positive().optional(),
  image: z.string().optional(),
  port: z.number().int().min(1000).max(9999).optional(),
  resourceIds: z.array(z.string()).optional(),
});

const updateWorkspaceSchema = createWorkspaceSchema.partial();

const addWorkspaceMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['maintainer', 'developer', 'viewer']).optional(),
});

export async function workspacesRoutes(fastify: FastifyInstance) {
  const dockerService = createDockerService(fastify);

  fastify.get(
    '/workspaces',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      if (request.authUser!.role === 'admin') {
        return fastify.db.select().from(workspaces);
      }

      const owned = await fastify.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.ownerId, request.authUser!.id));

      const memberOf = await fastify.db
        .select({ workspace: workspaces })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, request.authUser!.id));

      const map = new Map<string, typeof owned[number]>();
      for (const ws of owned) map.set(ws.id, ws);
      for (const item of memberOf) map.set(item.workspace.id, item.workspace);

      return Array.from(map.values());
    },
  );

  fastify.get(
    '/workspaces/by-key/:key',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('viewer')] },
    async (request, reply) => {
      const { key } = request.params as { key: string };

      const workspace = await fastify.db.query.workspaces.findFirst({
        where: eq(workspaces.key, key),
      });

      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' });
      }

      const synced = await reconcileWorkspaceContainer(fastify, dockerService, workspace);

      const deps = await fastify.db
        .select({ resource: resources })
        .from(workspaceDependencies)
        .innerJoin(resources, eq(workspaceDependencies.resourceId, resources.id))
        .where(eq(workspaceDependencies.workspaceId, workspace.id));

      return {
        ...synced,
        dependencies: deps.map((d) => d.resource),
      };
    },
  );

  fastify.get(
    '/workspaces/:id',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('viewer')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const workspace = await fastify.db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
      });

      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' });
      }

      return reconcileWorkspaceContainer(fastify, dockerService, workspace);
    },
  );

  fastify.post(
    '/workspaces',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = createWorkspaceSchema.parse(request.body);
      const key = slugify(body.key ?? body.name);
      const image = body.image ?? 'node:22-alpine';
      const port = body.port ?? 3000;

      const existing = await fastify.db.query.workspaces.findFirst({
        where: eq(workspaces.key, key),
      });

      if (existing) {
        return reply.status(409).send({ error: 'Workspace key already exists' });
      }

      const workspace = {
        id: createId(),
        key,
        name: body.name,
        description: body.description ?? null,
        ownerId: request.authUser!.id,
        cpuLimit: body.cpuLimit ?? null,
        memoryLimit: body.memoryLimit ?? null,
        visibility: body.visibility ?? ('restricted' as const),
        status: 'stopped' as const,
        containerId: null as string | null,
        image,
        port,
        createdAt: now(),
      };

      try {
        const container = await withTimeout(
          dockerService.createWorkspaceContainer({
            key,
            image,
            port,
            cpuLimit: workspace.cpuLimit,
            memoryLimit: workspace.memoryLimit,
          }),
          15_000,
          'Docker container creation timed out',
        );

        workspace.containerId = container.id;
      } catch (error) {
        fastify.log.warn({ err: error }, 'Failed to create Docker container');
      }

      await fastify.db.insert(workspaces).values(workspace);
      await fastify.db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: request.authUser!.id,
        role: 'owner',
      });

      if (body.resourceIds?.length) {
        await fastify.db.insert(workspaceDependencies).values(
          body.resourceIds.map((resourceId) => ({
            workspaceId: workspace.id,
            resourceId,
          })),
        );
      }

      return reply.status(201).send(workspace);
    },
  );

  fastify.patch(
    '/workspaces/:id',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('maintainer')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateWorkspaceSchema.parse(request.body);

      const workspace = await fastify.db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
      });

      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' });
      }

      const { resourceIds, ...workspaceFields } = body;

      if (Object.keys(workspaceFields).length > 0) {
        await fastify.db.update(workspaces).set(workspaceFields).where(eq(workspaces.id, id));
      }

      if (resourceIds !== undefined) {
        await fastify.db
          .delete(workspaceDependencies)
          .where(eq(workspaceDependencies.workspaceId, id));

        if (resourceIds.length) {
          await fastify.db.insert(workspaceDependencies).values(
            resourceIds.map((resourceId) => ({
              workspaceId: id,
              resourceId,
            })),
          );
        }
      }

      const updated = await fastify.db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
      });

      return updated;
    },
  );

  fastify.delete(
    '/workspaces/:id',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('owner')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const workspace = await fastify.db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
      });

      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' });
      }

      if (workspace.containerId) {
        await dockerService.removeContainer(workspace.containerId);
      }

      await fastify.db.delete(workspaces).where(eq(workspaces.id, id));
      return reply.status(204).send();
    },
  );

  fastify.get(
    '/workspaces/:id/env',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('viewer')] },
    async (request) => {
      const { id } = request.params as { id: string };

      const deps = await fastify.db
        .select({ resource: resources })
        .from(workspaceDependencies)
        .innerJoin(resources, eq(workspaceDependencies.resourceId, resources.id))
        .where(eq(workspaceDependencies.workspaceId, id));

      const env = deps.flatMap(({ resource }) =>
        buildEnvFromResource(resource.name, resource.endpoint, resource.envPrefix),
      );

      return { env };
    },
  );

  fastify.get(
    '/workspaces/:id/logs',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('developer')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const workspace = await fastify.db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
      });

      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' });
      }

      const synced = await reconcileWorkspaceContainer(fastify, dockerService, workspace);

      if (!synced.containerId) {
        return reply.status(404).send({ error: 'Container not found' });
      }

      const logs = await dockerService.getContainerLogs(synced.containerId);
      return { logs };
    },
  );

  fastify.get(
    '/workspaces/:id/stats',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('viewer')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const workspace = await fastify.db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
      });

      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' });
      }

      const synced = await reconcileWorkspaceContainer(fastify, dockerService, workspace);

      if (!synced.containerId) {
        return reply.status(404).send({ error: 'Container not found' });
      }

      try {
        const stats = await dockerService.getContainerStats(synced.containerId);
        return stats;
      } catch {
        return reply.status(503).send({ error: 'Stats unavailable' });
      }
    },
  );

  async function resolveContainerId(
    workspace: typeof workspaces.$inferSelect,
    reply: { status: (code: number) => { send: (payload: unknown) => unknown } },
  ) {
    const reconciled = await reconcileWorkspaceContainer(fastify, dockerService, workspace);

    if (!reconciled.containerId) {
      reply.status(503).send({ error: 'Failed to provision workspace container' });
      return null;
    }

    return reconciled.containerId;
  }

  async function lifecycleAction(
    id: string,
    action: 'start' | 'stop' | 'restart',
    reply: { status: (code: number) => { send: (payload: unknown) => unknown } },
  ) {
    const workspace = await fastify.db.query.workspaces.findFirst({
      where: eq(workspaces.id, id),
    });

    if (!workspace) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    const containerId = await resolveContainerId(workspace, reply);
    if (!containerId) {
      return;
    }

    if (action === 'start' || action === 'restart') {
      if (action === 'restart') {
        await withTimeout(
          dockerService.stopContainer(containerId),
          15_000,
          'Docker container stop timed out',
        );
      }
      await withTimeout(
        dockerService.startContainer(containerId),
        15_000,
        'Docker container start timed out',
      );
      await fastify.db
        .update(workspaces)
        .set({ status: 'running' })
        .where(eq(workspaces.id, id));
    } else {
      await withTimeout(
        dockerService.stopContainer(containerId),
        15_000,
        'Docker container stop timed out',
      );
      await fastify.db
        .update(workspaces)
        .set({ status: 'stopped' })
        .where(eq(workspaces.id, id));
    }

    return fastify.db.query.workspaces.findFirst({ where: eq(workspaces.id, id) });
  }

  fastify.post(
    '/workspaces/:id/start',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('developer')] },
    async (request, reply) =>
      lifecycleAction((request.params as { id: string }).id, 'start', reply),
  );

  fastify.post(
    '/workspaces/:id/stop',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('developer')] },
    async (request, reply) =>
      lifecycleAction((request.params as { id: string }).id, 'stop', reply),
  );

  fastify.post(
    '/workspaces/:id/restart',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('developer')] },
    async (request, reply) =>
      lifecycleAction((request.params as { id: string }).id, 'restart', reply),
  );

  fastify.get(
    '/workspaces/:id/member-candidates',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('maintainer')] },
    async (request) => {
      const { id } = request.params as { id: string };

      const members = await fastify.db
        .select({ userId: workspaceMembers.userId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, id));

      const memberIds = new Set(members.map((member) => member.userId));
      const allUsers = await fastify.db.select().from(users);

      return allUsers
        .filter((user) => !memberIds.has(user.id))
        .map(sanitizeUser);
    },
  );

  fastify.get(
    '/workspaces/:id/members',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('viewer')] },
    async (request) => {
      const { id } = request.params as { id: string };

      const members = await fastify.db
        .select({
          workspaceId: workspaceMembers.workspaceId,
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          user: users,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, id));

      return members.map((member) => ({
        workspaceId: member.workspaceId,
        userId: member.userId,
        role: member.role,
        user: sanitizeUser(member.user),
      }));
    },
  );

  fastify.post(
    '/workspaces/:id/members',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('maintainer')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = addWorkspaceMemberSchema.parse(request.body);

      const workspace = await fastify.db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
      });

      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' });
      }

      const user = await fastify.db.query.users.findFirst({
        where: eq(users.id, body.userId),
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const existing = await fastify.db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, body.userId),
        ),
      });

      if (existing) {
        return reply.status(409).send({ error: 'User already in workspace' });
      }

      const membership = {
        workspaceId: id,
        userId: body.userId,
        role: body.role ?? ('viewer' as const),
      };

      await fastify.db.insert(workspaceMembers).values(membership);

      return reply.status(201).send({
        ...membership,
        user: sanitizeUser(user),
      });
    },
  );

  fastify.delete(
    '/workspaces/:id/members/:userId',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('maintainer')] },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };

      const membership = await fastify.db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId),
        ),
      });

      if (!membership) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      if (membership.role === 'owner') {
        return reply.status(403).send({ error: 'Cannot remove workspace owner' });
      }

      await fastify.db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, id),
            eq(workspaceMembers.userId, userId),
          ),
        );

      return reply.status(204).send();
    },
  );
}
