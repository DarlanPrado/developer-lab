import type { AuthUser, GlobalRole, WorkspaceRole } from '@developer-lab/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }

  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

export interface AppConfig {
  port: number;
  host: string;
  jwtSecret: string;
  dbFileName: string;
  dockerSocket: string;
  labSharedNetwork: string;
  labDomain: string;
}

export const WORKSPACE_ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 4,
  maintainer: 3,
  developer: 2,
  viewer: 1,
};

export function requireAuth(request: FastifyRequest, reply: FastifyReply): void {
  if (!request.authUser) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}

export function requireRole(role: GlobalRole) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.authUser) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    if (request.authUser.role !== role && request.authUser.role !== 'admin') {
      reply.status(403).send({ error: 'Forbidden' });
    }
  };
}

export function hasWorkspaceRole(
  current: WorkspaceRole,
  required: WorkspaceRole,
): boolean {
  return WORKSPACE_ROLE_HIERARCHY[current] >= WORKSPACE_ROLE_HIERARCHY[required];
}

export function sanitizeUser<T extends { passwordHash?: string }>(
  user: T,
): Omit<T, 'passwordHash'> {
  const { passwordHash: _, ...rest } = user;
  return rest;
}
