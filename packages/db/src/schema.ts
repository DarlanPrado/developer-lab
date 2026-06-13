import { relations } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const teamMembers = sqliteTable('team_members', {
  teamId: text('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
});

export const resources = sqliteTable('resources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['postgresql', 'redis', 'rabbitmq', 'minio', 'mailpit', 'api', 'other'],
  }).notNull(),
  endpoint: text('endpoint').notNull(),
  description: text('description'),
  visibility: text('visibility', { enum: ['public', 'restricted', 'key_only'] })
    .notNull()
    .default('restricted'),
  status: text('status', { enum: ['online', 'degraded', 'offline', 'unknown'] })
    .notNull()
    .default('unknown'),
  documentation: text('documentation'),
  envPrefix: text('env_prefix'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  cpuLimit: real('cpu_limit'),
  memoryLimit: integer('memory_limit'),
  visibility: text('visibility', { enum: ['public', 'restricted', 'key_only'] })
    .notNull()
    .default('restricted'),
  status: text('status', { enum: ['running', 'stopped', 'sleep', 'error'] })
    .notNull()
    .default('stopped'),
  containerId: text('container_id'),
  image: text('image'),
  port: integer('port'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const workspaceMembers = sqliteTable('workspace_members', {
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', {
    enum: ['owner', 'maintainer', 'developer', 'viewer'],
  }).notNull(),
});

export const workspaceDependencies = sqliteTable('workspace_dependencies', {
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  resourceId: text('resource_id')
    .notNull()
    .references(() => resources.id, { onDelete: 'cascade' }),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  definition: text('definition').notNull(),
  version: text('version').notNull().default('v1'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const deployments = sqliteTable('deployments', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  commitHash: text('commit_hash'),
  status: text('status', { enum: ['pending', 'building', 'deployed', 'failed'] })
    .notNull()
    .default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  metadata: text('metadata'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
  workspaceMembers: many(workspaceMembers),
  teamMembers: many(teamMembers),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  dependencies: many(workspaceDependencies),
  deployments: many(deployments),
}));

export const resourcesRelations = relations(resources, ({ many }) => ({
  dependencies: many(workspaceDependencies),
}));

export const workspaceDependenciesRelations = relations(
  workspaceDependencies,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceDependencies.workspaceId],
      references: [workspaces.id],
    }),
    resource: one(resources, {
      fields: [workspaceDependencies.resourceId],
      references: [resources.id],
    }),
  }),
);
