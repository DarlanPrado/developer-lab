import { and, eq } from 'drizzle-orm';
import { teamMembers, teams, users } from '@developer-lab/db/schema';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../types.js';
import { createId, now } from '../utils/helpers.js';
import { sanitizeUser } from '../types.js';

const createTeamSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['owner', 'member']).optional(),
});

export async function teamsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/teams',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      if (request.authUser!.role === 'admin') {
        return fastify.db.select().from(teams);
      }

      const memberships = await fastify.db
        .select({ team: teams })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(teamMembers.userId, request.authUser!.id));

      return memberships.map((m) => m.team);
    },
  );

  fastify.post(
    '/teams',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = createTeamSchema.parse(request.body);

      const team = {
        id: createId(),
        name: body.name,
        description: body.description ?? null,
        createdAt: now(),
      };

      await fastify.db.insert(teams).values(team);
      await fastify.db.insert(teamMembers).values({
        teamId: team.id,
        userId: request.authUser!.id,
        role: 'owner',
      });

      return reply.status(201).send(team);
    },
  );

  fastify.get(
    '/teams/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.id, id),
      });

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      return team;
    },
  );

  fastify.get(
    '/teams/:id/members',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const members = await fastify.db
        .select({
          teamId: teamMembers.teamId,
          userId: teamMembers.userId,
          role: teamMembers.role,
          user: users,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, id));

      return members.map((member) => ({
        teamId: member.teamId,
        userId: member.userId,
        role: member.role,
        user: sanitizeUser(member.user),
      }));
    },
  );

  fastify.post(
    '/teams/:id/members',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = addMemberSchema.parse(request.body);

      const existing = await fastify.db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, id),
          eq(teamMembers.userId, body.userId),
        ),
      });

      if (existing) {
        return reply.status(409).send({ error: 'User already in team' });
      }

      const membership = {
        teamId: id,
        userId: body.userId,
        role: body.role ?? ('member' as const),
      };

      await fastify.db.insert(teamMembers).values(membership);
      return reply.status(201).send(membership);
    },
  );

  fastify.delete(
    '/teams/:id/members/:userId',
    { preHandler: [fastify.authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };

      await fastify.db
        .delete(teamMembers)
        .where(
          and(eq(teamMembers.teamId, id), eq(teamMembers.userId, userId)),
        );

      return reply.status(204).send();
    },
  );
}
