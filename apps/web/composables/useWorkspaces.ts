import type {
  CreateWorkspaceContainerRequest,
  CreateWorkspaceRequest,
  EnvVariable,
  Resource,
  User,
  Workspace,
  WorkspaceContainer,
  WorkspaceContainerStats,
  WorkspaceMemberWithUser,
  WorkspaceRole,
  WorkspaceWithContainers,
} from '@developer-lab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';

export type WorkspaceWithDependencies = WorkspaceWithContainers & {
  dependencies: Resource[];
};

type WorkspaceAction = 'start' | 'stop' | 'restart';
type ContainerAction = WorkspaceAction;

export function useWorkspacesQuery() {
  const { api } = useApi();
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api<Workspace[]>('/workspaces'),
  });
}

export function useWorkspaceQuery(key: MaybeRefOrGetter<string>) {
  const { api } = useApi();
  return useQuery({
    queryKey: computed(() => ['workspaces', 'by-key', toValue(key)]),
    queryFn: () =>
      api<WorkspaceWithDependencies>(`/workspaces/by-key/${toValue(key)}`),
    enabled: computed(() => !!toValue(key)),
  });
}

export function useWorkspaceEnvQuery(
  workspaceId: MaybeRefOrGetter<string | undefined>,
) {
  const { api } = useApi();
  return useQuery({
    queryKey: computed(() => ['workspaces', toValue(workspaceId), 'env']),
    queryFn: () =>
      api<{ env: EnvVariable[] }>(`/workspaces/${toValue(workspaceId)}/env`),
    enabled: computed(() => !!toValue(workspaceId)),
  });
}

export function useWorkspaceMembersQuery(
  workspaceId: MaybeRefOrGetter<string | undefined>,
) {
  const { api } = useApi();
  return useQuery({
    queryKey: computed(() => ['workspaces', toValue(workspaceId), 'members']),
    queryFn: () =>
      api<WorkspaceMemberWithUser[]>(`/workspaces/${toValue(workspaceId)}/members`),
    enabled: computed(() => !!toValue(workspaceId)),
  });
}

export function useWorkspaceMemberCandidatesQuery(
  workspaceId: MaybeRefOrGetter<string | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const { api } = useApi();
  return useQuery({
    queryKey: computed(() => ['workspaces', toValue(workspaceId), 'member-candidates']),
    queryFn: () =>
      api<User[]>(`/workspaces/${toValue(workspaceId)}/member-candidates`),
    enabled: computed(() => !!toValue(workspaceId) && toValue(enabled)),
  });
}

export function useCreateWorkspaceMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkspaceRequest) =>
      api<Workspace>('/workspaces', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useUpdateWorkspaceMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<CreateWorkspaceRequest>;
    }) => api<Workspace>(`/workspaces/${id}`, { method: 'PATCH', body }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'by-key'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', id, 'env'] });
    },
  });
}

export function useAddWorkspaceMemberMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      body,
    }: {
      workspaceId: string;
      body: { userId: string; role?: Exclude<WorkspaceRole, 'owner'> };
    }) =>
      api<WorkspaceMemberWithUser>(`/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body,
      }),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ['workspaces', workspaceId, 'members'],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspaces', workspaceId, 'member-candidates'],
      });
    },
  });
}

export function useRemoveWorkspaceMemberMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      userId,
    }: {
      workspaceId: string;
      userId: string;
    }) =>
      api<void>(`/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ['workspaces', workspaceId, 'members'],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspaces', workspaceId, 'member-candidates'],
      });
    },
  });
}

export function useWorkspaceActionMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      action,
    }: {
      workspaceId: string;
      action: WorkspaceAction;
    }) =>
      api<Workspace>(`/workspaces/${workspaceId}/${action}`, {
        method: 'POST',
      }),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'by-key'] });
    },
  });
}

export function useWorkspaceLogsQuery(
  workspaceId: MaybeRefOrGetter<string | undefined>,
) {
  const { api } = useApi();
  return useQuery({
    queryKey: computed(() => ['workspaces', toValue(workspaceId), 'logs']),
    queryFn: () =>
      api<{ logs: string }>(`/workspaces/${toValue(workspaceId)}/logs`),
    enabled: computed(() => !!toValue(workspaceId)),
  });
}

export function useWorkspaceContainersQuery(
  workspaceId: MaybeRefOrGetter<string | undefined>,
) {
  const { api } = useApi();
  return useQuery({
    queryKey: computed(() => ['workspaces', toValue(workspaceId), 'containers']),
    queryFn: () =>
      api<WorkspaceContainer[]>(`/workspaces/${toValue(workspaceId)}/containers`),
    enabled: computed(() => !!toValue(workspaceId)),
    refetchInterval: 5000,
  });
}

export function useContainerActionMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      containerId,
      action,
    }: {
      workspaceId: string;
      containerId: string;
      action: ContainerAction;
    }) =>
      api<WorkspaceContainer>(
        `/workspaces/${workspaceId}/containers/${containerId}/${action}`,
        { method: 'POST' },
      ),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'by-key'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'containers'] });
    },
  });
}

export function useCreateContainerMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      body,
    }: {
      workspaceId: string;
      body: CreateWorkspaceContainerRequest;
    }) =>
      api<WorkspaceContainer>(`/workspaces/${workspaceId}/containers`, {
        method: 'POST',
        body,
      }),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'containers'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'by-key'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'manifest'] });
    },
  });
}

export function useRemoveContainerMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      containerId,
    }: {
      workspaceId: string;
      containerId: string;
    }) =>
      api<void>(`/workspaces/${workspaceId}/containers/${containerId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'containers'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'by-key'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'manifest'] });
    },
  });
}

export function useContainerLogsQuery(
  workspaceId: MaybeRefOrGetter<string | undefined>,
  containerId: MaybeRefOrGetter<string | undefined>,
) {
  const { api } = useApi();
  return useQuery({
    queryKey: computed(() => ['workspaces', toValue(workspaceId), 'containers', toValue(containerId), 'logs']),
    queryFn: () =>
      api<{ logs: string }>(
        `/workspaces/${toValue(workspaceId)}/containers/${toValue(containerId)}/logs`,
      ),
    enabled: computed(() => !!toValue(workspaceId) && !!toValue(containerId)),
  });
}

export function useContainerStatsQuery(
  workspaceId: MaybeRefOrGetter<string | undefined>,
  containerId: MaybeRefOrGetter<string | undefined>,
) {
  const { api } = useApi();
  return useQuery({
    queryKey: computed(() => ['workspaces', toValue(workspaceId), 'containers', toValue(containerId), 'stats']),
    queryFn: () =>
      api<WorkspaceContainerStats>(
        `/workspaces/${toValue(workspaceId)}/containers/${toValue(containerId)}/stats`,
      ),
    enabled: computed(() => !!toValue(workspaceId) && !!toValue(containerId)),
    refetchInterval: 5000,
  });
}

export function useWorkspaceManifestQuery(
  workspaceId: MaybeRefOrGetter<string | undefined>,
) {
  const { api } = useApi();
  return useQuery({
    queryKey: computed(() => ['workspaces', toValue(workspaceId), 'manifest']),
    queryFn: () =>
      api<{ manifest: string }>(`/workspaces/${toValue(workspaceId)}/manifest`),
    enabled: computed(() => !!toValue(workspaceId)),
  });
}

export function useUpdateWorkspaceManifestMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      manifest,
    }: {
      workspaceId: string;
      manifest: string;
    }) =>
      api<{ manifest: string; containers: WorkspaceContainer[] }>(
        `/workspaces/${workspaceId}/manifest`,
        { method: 'PUT', body: { manifest } },
      ),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'manifest'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'containers'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'by-key'] });
    },
  });
}
