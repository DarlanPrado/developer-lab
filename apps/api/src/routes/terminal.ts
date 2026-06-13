import type { AuthUser, WorkspaceRole } from '@developer-lab/shared';
import { and, eq } from 'drizzle-orm';
import { workspaceMembers, workspaces } from '@developer-lab/db/schema';
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { hasWorkspaceRole } from '../types.js';
import { createDockerService } from '../services/docker.service.js';
import { reconcileWorkspaceContainer } from '../services/workspace-container.service.js';

interface TerminalMessage {
  type: 'resize';
  rows: number;
  cols: number;
}

async function canAccessWorkspace(
  fastify: FastifyInstance,
  workspaceId: string,
  userId: string,
  userRole: string,
  requiredRole: WorkspaceRole,
) {
  const workspace = await fastify.db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace) return false;
  if (workspace.ownerId === userId || userRole === 'admin') return true;

  const membership = await fastify.db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ),
  });

  return membership ? hasWorkspaceRole(membership.role, requiredRole) : false;
}

export async function terminalRoutes(fastify: FastifyInstance) {
  const dockerService = createDockerService(fastify);

  fastify.get(
    '/ws/terminal/:key',
    { websocket: true },
    async (socket: WebSocket, request) => {
      const { key } = request.params as { key: string };
      const token =
        (request.query as { token?: string }).token
        ?? request.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        socket.close(4401, 'Missing token');
        return;
      }

      let authUser: AuthUser;
      try {
        authUser = fastify.jwt.verify<AuthUser>(token);
      } catch {
        socket.close(4401, 'Invalid token');
        return;
      }

      const workspace = await fastify.db.query.workspaces.findFirst({
        where: eq(workspaces.key, key),
      });

      if (!workspace) {
        socket.close(4404, 'Workspace not found');
        return;
      }

      const allowed = await canAccessWorkspace(
        fastify,
        workspace.id,
        authUser.id,
        authUser.role,
        'developer',
      );

      if (!allowed) {
        socket.close(4403, 'Forbidden');
        return;
      }

      const synced = await reconcileWorkspaceContainer(fastify, dockerService, workspace);

      if (!synced.containerId) {
        socket.close(4404, 'Container not found');
        return;
      }

      if (synced.status !== 'running') {
        try {
          await dockerService.startContainer(synced.containerId);
          await fastify.db
            .update(workspaces)
            .set({ status: 'running' })
            .where(eq(workspaces.id, workspace.id));
        } catch (error) {
          fastify.log.error({ err: error }, 'Failed to start workspace container for terminal');
          socket.close(4403, 'Workspace container is not running');
          return;
        }
      }

      const container = fastify.docker.getContainer(synced.containerId);

      try {
        const exec = await container.exec({
          Cmd: ['/bin/sh'],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
        });

        const stream = await exec.start({
          hijack: true,
          stdin: true,
        });

        stream.on('data', (data: Buffer) => {
          if (socket.readyState === socket.OPEN) {
            socket.send(data);
          }
        });

        stream.on('error', (error: Error) => {
          fastify.log.error({ err: error }, 'Terminal stream error');
          if (socket.readyState === socket.OPEN) {
            socket.send(`\r\n[erro] ${error.message}\r\n`);
            socket.close(1011, 'Terminal stream error');
          }
        });

        socket.on('message', (message) => {
          const text = message.toString();

          try {
            const parsed = JSON.parse(text) as TerminalMessage;
            if (parsed.type === 'resize') {
              void exec.resize({ h: parsed.rows, w: parsed.cols });
              return;
            }
          } catch {
            // Not JSON, treat as terminal input
          }

          stream.write(text);
        });

        socket.on('close', () => {
          stream.end();
        });

        stream.on('end', () => {
          socket.close();
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Terminal connection failed');
        if (socket.readyState === socket.OPEN) {
          const message = error instanceof Error ? error.message : 'Terminal error';
          socket.send(`\r\n[erro] ${message}\r\n`);
        }
        socket.close(1011, 'Terminal error');
      }
    },
  );
}
