import { eq } from 'drizzle-orm';
import { templates } from '@developer-lab/db/schema';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../types.js';
import { createId, now } from '../utils/helpers.js';

const createTemplateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  definition: z.string().min(1),
  version: z.string().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

export async function templatesRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/templates',
    { preHandler: [fastify.authenticate] },
    async () => {
      return fastify.db.select().from(templates);
    },
  );

  fastify.get(
    '/templates/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const template = await fastify.db.query.templates.findFirst({
        where: eq(templates.id, id),
      });

      if (!template) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      return template;
    },
  );

  fastify.post(
    '/templates',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const body = createTemplateSchema.parse(request.body);

      const template = {
        id: createId(),
        name: body.name,
        description: body.description ?? null,
        definition: body.definition,
        version: body.version ?? 'v1',
        createdAt: now(),
      };

      await fastify.db.insert(templates).values(template);
      return reply.status(201).send(template);
    },
  );

  fastify.patch(
    '/templates/:id',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateTemplateSchema.parse(request.body);

      const template = await fastify.db.query.templates.findFirst({
        where: eq(templates.id, id),
      });

      if (!template) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      await fastify.db.update(templates).set(body).where(eq(templates.id, id));

      const updated = await fastify.db.query.templates.findFirst({
        where: eq(templates.id, id),
      });

      return updated;
    },
  );

  fastify.delete(
    '/templates/:id',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await fastify.db.delete(templates).where(eq(templates.id, id));
      return reply.status(204).send();
    },
  );
}
