import { eq } from 'drizzle-orm';
import { users } from '@developer-lab/db/schema';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../types.js';
import { createId, now } from '../utils/helpers.js';
import { sanitizeUser } from '../types.js';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'user']).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).optional(),
});

export async function usersRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/users',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async () => {
      const allUsers = await fastify.db.select().from(users);
      return allUsers.map(sanitizeUser);
    },
  );

  fastify.get(
    '/users/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (request.authUser!.role !== 'admin' && request.authUser!.id !== id) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const user = await fastify.db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return sanitizeUser(user);
    },
  );

  fastify.post(
    '/users',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const body = createUserSchema.parse(request.body);
      const bcrypt = await import('bcryptjs');

      const existing = await fastify.db.query.users.findFirst({
        where: eq(users.email, body.email),
      });

      if (existing) {
        return reply.status(409).send({ error: 'Email already exists' });
      }

      const user = {
        id: createId(),
        name: body.name,
        email: body.email,
        passwordHash: await bcrypt.hash(body.password, 10),
        role: body.role ?? ('user' as const),
        createdAt: now(),
      };

      await fastify.db.insert(users).values(user);
      return reply.status(201).send(sanitizeUser(user));
    },
  );

  fastify.patch(
    '/users/:id',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateUserSchema.parse(request.body);

      const user = await fastify.db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      await fastify.db.update(users).set(body).where(eq(users.id, id));

      const updated = await fastify.db.query.users.findFirst({
        where: eq(users.id, id),
      });

      return sanitizeUser(updated!);
    },
  );

  fastify.delete(
    '/users/:id',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await fastify.db.delete(users).where(eq(users.id, id));
      return reply.status(204).send();
    },
  );
}
