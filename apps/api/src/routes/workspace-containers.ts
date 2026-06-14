import { and, asc, eq } from 'drizzle-orm';
import { workspaceContainers, workspaces } from '@developer-lab/db/schema';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireWorkspaceRole } from '../middleware/workspace-permission.js';
import { createDockerService } from '../services/docker.service.js';
import {
  envVariablesToDockerEnv,
  reconcileWorkspaceContainers,
  sanitizeWorkspaceContainer,
  serializeContainerEnv,
  syncWorkspaceManifest,
} from '../services/workspace-container.service.js';
import {
  manifestToContainerRequests,
  parseWorkspaceManifest,
} from '../services/workspace-manifest.service.js';
import { createId, withTimeout } from '../utils/helpers.js';

const createContainerSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/),
  image: z.string().min(1),
  port: z.number().int().min(1).max(65535).nullable().optional(),
  exposeViaTraefik: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  env: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  cpuLimit: z.number().positive().nullable().optional(),
  memoryLimit: z.number().int().positive().nullable().optional(),
  order: z.number().int().min(0).optional(),
});

const updateContainerSchema = createContainerSchema.partial();

const manifestSchema = z.object({
  manifest: z.string().min(1),
});

async function getWorkspaceOr404(fastify: FastifyInstance, id: string, reply: { status: (code: number) => { send: (payload: unknown) => unknown } }) {
  const workspace = await fastify.db.query.workspaces.findFirst({
    where: eq(workspaces.id, id),
  });

  if (!workspace) {
    reply.status(404).send({ error: 'Workspace not found' });
    return null;
  }

  return workspace;
}

async function getContainerOr404(
  fastify: FastifyInstance,
  workspaceId: string,
  containerId: string,
  reply: { status: (code: number) => { send: (payload: unknown) => unknown } },
) {
  const container = await fastify.db.query.workspaceContainers.findFirst({
    where: and(
      eq(workspaceContainers.workspaceId, workspaceId),
      eq(workspaceContainers.id, containerId),
    ),
  });

  if (!container) {
    reply.status(404).send({ error: 'Container not found' });
    return null;
  }

  return container;
}

export async function workspaceContainerRoutes(fastify: FastifyInstance) {
  const dockerService = createDockerService(fastify);

  fastify.get(
    '/workspaces/:id/containers',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('viewer')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const workspace = await getWorkspaceOr404(fastify, id, reply);
      if (!workspace) return;

      const synced = await reconcileWorkspaceContainers(fastify, dockerService, workspace);
      return synced.containers;
    },
  );

  fastify.post(
    '/workspaces/:id/containers',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('maintainer')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = createContainerSchema.parse(request.body);
      const workspace = await getWorkspaceOr404(fastify, id, reply);
      if (!workspace) return;

      const existing = await fastify.db.query.workspaceContainers.findFirst({
        where: and(
          eq(workspaceContainers.workspaceId, id),
          eq(workspaceContainers.name, body.name),
        ),
      });

      if (existing) {
        return reply.status(409).send({ error: 'Container name already exists' });
      }

      if (body.isPrimary) {
        await fastify.db
          .update(workspaceContainers)
          .set({ isPrimary: false })
          .where(eq(workspaceContainers.workspaceId, id));
      }

      const row = {
        id: createId(),
        workspaceId: id,
        name: body.name,
        image: body.image,
        port: body.port ?? null,
        exposeViaTraefik: body.exposeViaTraefik ?? false,
        isPrimary: body.isPrimary ?? false,
        containerId: null,
        status: 'stopped' as const,
        env: serializeContainerEnv(body.env ?? []),
        cpuLimit: body.cpuLimit ?? null,
        memoryLimit: body.memoryLimit ?? null,
        order: body.order ?? 0,
      };

      await fastify.db.insert(workspaceContainers).values(row);

      try {
        const container = await dockerService.createSubContainer({
          workspaceKey: workspace.key,
          containerName: row.name,
          image: row.image,
          port: row.port,
          exposeViaTraefik: row.exposeViaTraefik,
          env: envVariablesToDockerEnv(body.env ?? []),
          cpuLimit: row.cpuLimit,
          memoryLimit: row.memoryLimit,
        });

        await fastify.db
          .update(workspaceContainers)
          .set({ containerId: container.id })
          .where(eq(workspaceContainers.id, row.id));
      } catch (error) {
        fastify.log.warn({ err: error }, 'Failed to create workspace subcontainer');
      }

      await syncWorkspaceManifest(fastify, id);

      const created = await fastify.db.query.workspaceContainers.findFirst({
        where: eq(workspaceContainers.id, row.id),
      });

      return reply.status(201).send(sanitizeWorkspaceContainer(created!));
    },
  );

  fastify.patch(
    '/workspaces/:id/containers/:cid',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('maintainer')] },
    async (request, reply) => {
      const { id, cid } = request.params as { id: string; cid: string };
      const body = updateContainerSchema.parse(request.body);
      const container = await getContainerOr404(fastify, id, cid, reply);
      if (!container) return;

      if (body.isPrimary) {
        await fastify.db
          .update(workspaceContainers)
          .set({ isPrimary: false })
          .where(eq(workspaceContainers.workspaceId, id));
      }

      const updates: Partial<typeof workspaceContainers.$inferInsert> = {};

      if (body.name !== undefined) updates.name = body.name;
      if (body.image !== undefined) updates.image = body.image;
      if (body.port !== undefined) updates.port = body.port;
      if (body.exposeViaTraefik !== undefined) updates.exposeViaTraefik = body.exposeViaTraefik;
      if (body.isPrimary !== undefined) updates.isPrimary = body.isPrimary;
      if (body.env !== undefined) updates.env = serializeContainerEnv(body.env);
      if (body.cpuLimit !== undefined) updates.cpuLimit = body.cpuLimit;
      if (body.memoryLimit !== undefined) updates.memoryLimit = body.memoryLimit;
      if (body.order !== undefined) updates.order = body.order;

      if (Object.keys(updates).length > 0) {
        await fastify.db
          .update(workspaceContainers)
          .set(updates)
          .where(eq(workspaceContainers.id, cid));
      }

      await syncWorkspaceManifest(fastify, id);

      const updated = await fastify.db.query.workspaceContainers.findFirst({
        where: eq(workspaceContainers.id, cid),
      });

      return sanitizeWorkspaceContainer(updated!);
    },
  );

  fastify.delete(
    '/workspaces/:id/containers/:cid',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('maintainer')] },
    async (request, reply) => {
      const { id, cid } = request.params as { id: string; cid: string };
      const container = await getContainerOr404(fastify, id, cid, reply);
      if (!container) return;

      if (container.containerId) {
        await dockerService.removeContainer(container.containerId);
      }

      await fastify.db.delete(workspaceContainers).where(eq(workspaceContainers.id, cid));
      await syncWorkspaceManifest(fastify, id);

      return reply.status(204).send();
    },
  );

  async function containerLifecycle(
    workspaceId: string,
    containerId: string,
    action: 'start' | 'stop' | 'restart',
    reply: { status: (code: number) => { send: (payload: unknown) => unknown } },
  ) {
    const container = await getContainerOr404(fastify, workspaceId, containerId, reply);
    if (!container) return;

    const workspace = await getWorkspaceOr404(fastify, workspaceId, reply);
    if (!workspace) return;

    const synced = await reconcileWorkspaceContainers(fastify, dockerService, workspace);
    const current = synced.containers.find((item) => item.id === containerId);

    if (!current?.containerId) {
      return reply.status(503).send({ error: 'Container not provisioned' });
    }

    if (action === 'start' || action === 'restart') {
      if (action === 'restart') {
        await withTimeout(
          dockerService.stopContainer(current.containerId),
          15_000,
          'Docker container stop timed out',
        );
      }
      await withTimeout(
        dockerService.startContainer(current.containerId),
        15_000,
        'Docker container start timed out',
      );
      await fastify.db
        .update(workspaceContainers)
        .set({ status: 'running' })
        .where(eq(workspaceContainers.id, containerId));
    } else {
      await withTimeout(
        dockerService.stopContainer(current.containerId),
        15_000,
        'Docker container stop timed out',
      );
      await fastify.db
        .update(workspaceContainers)
        .set({ status: 'stopped' })
        .where(eq(workspaceContainers.id, containerId));
    }

    await reconcileWorkspaceContainers(fastify, dockerService, workspace);

    const updated = await fastify.db.query.workspaceContainers.findFirst({
      where: eq(workspaceContainers.id, containerId),
    });

    return sanitizeWorkspaceContainer(updated!);
  }

  fastify.post(
    '/workspaces/:id/containers/:cid/start',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('developer')] },
    async (request, reply) => {
      const { id, cid } = request.params as { id: string; cid: string };
      return containerLifecycle(id, cid, 'start', reply);
    },
  );

  fastify.post(
    '/workspaces/:id/containers/:cid/stop',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('developer')] },
    async (request, reply) => {
      const { id, cid } = request.params as { id: string; cid: string };
      return containerLifecycle(id, cid, 'stop', reply);
    },
  );

  fastify.post(
    '/workspaces/:id/containers/:cid/restart',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('developer')] },
    async (request, reply) => {
      const { id, cid } = request.params as { id: string; cid: string };
      return containerLifecycle(id, cid, 'restart', reply);
    },
  );

  fastify.get(
    '/workspaces/:id/containers/:cid/logs',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('developer')] },
    async (request, reply) => {
      const { id, cid } = request.params as { id: string; cid: string };
      const container = await getContainerOr404(fastify, id, cid, reply);
      if (!container) return;

      const workspace = await getWorkspaceOr404(fastify, id, reply);
      if (!workspace) return;

      const synced = await reconcileWorkspaceContainers(fastify, dockerService, workspace);
      const current = synced.containers.find((item) => item.id === cid);

      if (!current?.containerId) {
        return reply.status(404).send({ error: 'Container not found' });
      }

      const logs = await dockerService.getContainerLogs(current.containerId);
      return { logs };
    },
  );

  fastify.get(
    '/workspaces/:id/containers/:cid/stats',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('viewer')] },
    async (request, reply) => {
      const { id, cid } = request.params as { id: string; cid: string };
      const container = await getContainerOr404(fastify, id, cid, reply);
      if (!container) return;

      const workspace = await getWorkspaceOr404(fastify, id, reply);
      if (!workspace) return;

      const synced = await reconcileWorkspaceContainers(fastify, dockerService, workspace);
      const current = synced.containers.find((item) => item.id === cid);

      if (!current?.containerId) {
        return reply.status(404).send({ error: 'Container not found' });
      }

      try {
        return await dockerService.getContainerStats(current.containerId);
      } catch {
        return reply.status(503).send({ error: 'Stats unavailable' });
      }
    },
  );

  fastify.get(
    '/workspaces/:id/manifest',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('viewer')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const workspace = await getWorkspaceOr404(fastify, id, reply);
      if (!workspace) return;

      if (workspace.manifest) {
        return { manifest: workspace.manifest };
      }

      const manifest = await syncWorkspaceManifest(fastify, id);
      return { manifest };
    },
  );

  fastify.put(
    '/workspaces/:id/manifest',
    { preHandler: [fastify.authenticate, requireWorkspaceRole('maintainer')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = manifestSchema.parse(request.body);
      const workspace = await getWorkspaceOr404(fastify, id, reply);
      if (!workspace) return;

      const parsedServices = parseWorkspaceManifest(body.manifest);
      const desired = manifestToContainerRequests(parsedServices);

      const existing = await fastify.db.query.workspaceContainers.findMany({
        where: eq(workspaceContainers.workspaceId, id),
        orderBy: [asc(workspaceContainers.order), asc(workspaceContainers.name)],
      });

      const existingByName = new Map(existing.map((row) => [row.name, row]));
      const desiredNames = new Set(desired.map((item) => item.name));

      for (const item of desired) {
        const current = existingByName.get(item.name);

        if (current) {
          await fastify.db
            .update(workspaceContainers)
            .set({
              image: item.image,
              port: item.port,
              exposeViaTraefik: item.exposeViaTraefik,
              isPrimary: item.isPrimary,
              env: serializeContainerEnv(item.env),
              order: item.order,
            })
            .where(eq(workspaceContainers.id, current.id));
          continue;
        }

        await fastify.db.insert(workspaceContainers).values({
          id: createId(),
          workspaceId: id,
          name: item.name,
          image: item.image,
          port: item.port,
          exposeViaTraefik: item.exposeViaTraefik,
          isPrimary: item.isPrimary,
          containerId: null,
          status: 'stopped',
          env: serializeContainerEnv(item.env),
          cpuLimit: item.cpuLimit,
          memoryLimit: item.memoryLimit,
          order: item.order,
        });
      }

      for (const row of existing) {
        if (!desiredNames.has(row.name)) {
          if (row.containerId) {
            await dockerService.removeContainer(row.containerId);
          }
          await fastify.db.delete(workspaceContainers).where(eq(workspaceContainers.id, row.id));
        }
      }

      await fastify.db
        .update(workspaces)
        .set({ manifest: body.manifest })
        .where(eq(workspaces.id, id));

      const synced = await reconcileWorkspaceContainers(fastify, dockerService, workspace);
      return { manifest: body.manifest, containers: synced.containers };
    },
  );
}
