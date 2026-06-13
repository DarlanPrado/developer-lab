import type { AuthUser } from '@developer-lab/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(import('@fastify/jwt'), {
    secret: fastify.config.jwtSecret,
  });

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const payload = await request.jwtVerify<AuthUser>();
        request.authUser = payload;
      } catch {
        reply.status(401).send({ error: 'Unauthorized' });
      }
    },
  );
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}
