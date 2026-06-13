import { eq } from 'drizzle-orm';
import { resources } from '@developer-lab/db/schema';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../types.js';
import { createId, now } from '../utils/helpers.js';

const createResourceSchema = z.object({
  name: z.string().min(2),
  type: z.enum([
    'postgresql',
    'redis',
    'rabbitmq',
    'minio',
    'mailpit',
    'api',
    'other',
  ]),
  endpoint: z.string().min(1),
  description: z.string().optional(),
  visibility: z.enum(['public', 'restricted', 'key_only']).optional(),
  documentation: z.string().optional(),
  envPrefix: z.string().optional(),
});

const updateResourceSchema = createResourceSchema.partial();

export async function resourcesRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/resources',
    { preHandler: [fastify.authenticate] },
    async () => {
      return fastify.db.select().from(resources);
    },
  );

  fastify.get(
    '/resources/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const resource = await fastify.db.query.resources.findFirst({
        where: eq(resources.id, id),
      });

      if (!resource) {
        return reply.status(404).send({ error: 'Resource not found' });
      }

      return resource;
    },
  );

  fastify.post(
    '/resources',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const body = createResourceSchema.parse(request.body);

      const resource = {
        id: createId(),
        name: body.name,
        type: body.type,
        endpoint: body.endpoint,
        description: body.description ?? null,
        visibility: body.visibility ?? ('restricted' as const),
        status: 'unknown' as const,
        documentation: body.documentation ?? null,
        envPrefix: body.envPrefix ?? null,
        createdAt: now(),
      };

      await fastify.db.insert(resources).values(resource);
      return reply.status(201).send(resource);
    },
  );

  fastify.patch(
    '/resources/:id',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateResourceSchema.parse(request.body);

      const resource = await fastify.db.query.resources.findFirst({
        where: eq(resources.id, id),
      });

      if (!resource) {
        return reply.status(404).send({ error: 'Resource not found' });
      }

      await fastify.db.update(resources).set(body).where(eq(resources.id, id));

      const updated = await fastify.db.query.resources.findFirst({
        where: eq(resources.id, id),
      });

      return updated;
    },
  );

  fastify.delete(
    '/resources/:id',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await fastify.db.delete(resources).where(eq(resources.id, id));
      return reply.status(204).send();
    },
  );
}
