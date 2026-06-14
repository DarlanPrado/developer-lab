export type GlobalRole = 'admin' | 'user';

export type WorkspaceRole = 'owner' | 'maintainer' | 'developer' | 'viewer';

export type Visibility = 'public' | 'restricted' | 'key_only';

export type WorkspaceStatus = 'running' | 'stopped' | 'sleep' | 'error';

export type WorkspaceContainerStatus = 'running' | 'stopped' | 'error';

export type ResourceStatus = 'online' | 'degraded' | 'offline' | 'unknown';

export type ResourceType =
  | 'postgresql'
  | 'redis'
  | 'rabbitmq'
  | 'minio'
  | 'mailpit'
  | 'api'
  | 'other';

export type DeploymentStatus = 'pending' | 'building' | 'deployed' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: GlobalRole;
  createdAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: 'owner' | 'member';
}

export interface TeamMemberWithUser extends TeamMember {
  user: User;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  endpoint: string;
  description: string | null;
  visibility: Visibility;
  status: ResourceStatus;
  documentation: string | null;
  envPrefix: string | null;
  createdAt: Date;
}

export interface Workspace {
  id: string;
  key: string;
  name: string;
  description: string | null;
  ownerId: string;
  cpuLimit: number | null;
  memoryLimit: number | null;
  visibility: Visibility;
  status: WorkspaceStatus;
  containerId: string | null;
  image: string | null;
  port: number | null;
  manifest: string | null;
  createdAt: Date;
}

export interface WorkspaceContainer {
  id: string;
  workspaceId: string;
  name: string;
  image: string;
  port: number | null;
  exposeViaTraefik: boolean;
  isPrimary: boolean;
  containerId: string | null;
  status: WorkspaceContainerStatus;
  env: EnvVariable[];
  cpuLimit: number | null;
  memoryLimit: number | null;
  order: number;
}

export interface WorkspaceContainerStats {
  containerId: string;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
}

export type CreateWorkspaceContainerRequest = Omit<
  WorkspaceContainer,
  'id' | 'workspaceId' | 'containerId' | 'status'
>;

export interface WorkspaceWithContainers extends Workspace {
  containers: WorkspaceContainer[];
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user: User;
}

export interface WorkspaceDependency {
  workspaceId: string;
  resourceId: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  definition: string;
  version: string;
  createdAt: Date;
}

export interface Deployment {
  id: string;
  workspaceId: string;
  commitHash: string | null;
  status: DeploymentStatus;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  createdAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  role: GlobalRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateWorkspaceRequest {
  key?: string;
  name: string;
  description?: string;
  visibility?: Visibility;
  cpuLimit?: number;
  memoryLimit?: number;
  image?: string;
  port?: number;
  resourceIds?: string[];
  containers?: CreateWorkspaceContainerRequest[];
}

export interface CreateResourceRequest {
  name: string;
  type: ResourceType;
  endpoint: string;
  description?: string;
  visibility?: Visibility;
  documentation?: string;
  envPrefix?: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  definition: string;
  version?: string;
}

export interface EnvVariable {
  key: string;
  value: string;
}
