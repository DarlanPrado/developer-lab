import Docker from 'dockerode';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    docker: Docker;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const docker = new Docker({ socketPath: fastify.config.dockerSocket });
  fastify.decorate('docker', docker);
});
