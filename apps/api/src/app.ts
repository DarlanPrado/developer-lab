import 'dotenv/config';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import authPlugin from './plugins/auth.js';
import dbPlugin from './plugins/db.js';
import dockerPlugin from './plugins/docker.js';
import websocketPlugin from './plugins/websocket.js';
import { authRoutes } from './routes/auth.js';
import { resourcesRoutes } from './routes/resources.js';
import { teamsRoutes } from './routes/teams.js';
import { templatesRoutes } from './routes/templates.js';
import { terminalRoutes } from './routes/terminal.js';
import { usersRoutes } from './routes/users.js';
import { workspacesRoutes } from './routes/workspaces.js';
import { createHealthService } from './services/health.service.js';
import type { AppConfig } from './types.js';

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  dbFileName: process.env.DB_FILE_NAME ?? './data/lab.db',
  dockerSocket: process.env.DOCKER_SOCKET
    ?? (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock'),
  labSharedNetwork: process.env.LAB_SHARED_NETWORK ?? 'lab-shared',
  labDomain: process.env.LAB_DOMAIN ?? 'lab',
};

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.decorate('config', config);

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_request, body, done) => {
      const raw = typeof body === 'string' ? body : body.toString('utf8');

      if (!raw.length) {
        done(null, {});
        return;
      }

      try {
        done(null, JSON.parse(raw));
      } catch (error) {
        done(error as Error, undefined);
      }
    },
  );

  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(dockerPlugin);
  await app.register(websocketPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const fastifyError = error as { statusCode?: number };
    const statusCode = typeof fastifyError.statusCode === 'number'
      ? fastifyError.statusCode
      : 500;

    if (statusCode >= 500) {
      app.log.error(error);
    }

    return reply.status(statusCode).send({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  });

  await app.register(authRoutes);
  await app.register(usersRoutes);
  await app.register(teamsRoutes);
  await app.register(resourcesRoutes);
  await app.register(workspacesRoutes);
  await app.register(templatesRoutes);
  await app.register(terminalRoutes);

  const healthService = createHealthService(app);
  healthService.start();

  app.addHook('onClose', async () => {
    healthService.stop();
  });

  return app;
}
