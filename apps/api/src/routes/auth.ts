import { eq } from 'drizzle-orm';
import { users } from '@developer-lab/db/schema';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createId, now } from '../utils/helpers.js';
import { sanitizeUser } from '../types.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await fastify.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const userCount = await fastify.db.select().from(users);

    const user = {
      id: createId(),
      name: body.name,
      email: body.email,
      passwordHash,
      role: userCount.length === 0 ? ('admin' as const) : ('user' as const),
      createdAt: now(),
    };

    await fastify.db.insert(users).values(user);

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return reply.status(201).send({
      token,
      user: sanitizeUser(user),
    });
  });

  fastify.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await fastify.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: sanitizeUser(user),
    };
  });

  fastify.get(
    '/auth/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = await fastify.db.query.users.findFirst({
        where: eq(users.id, request.authUser!.id),
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return sanitizeUser(user);
    },
  );
}
