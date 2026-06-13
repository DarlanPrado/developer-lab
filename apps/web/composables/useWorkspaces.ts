import type {
  CreateWorkspaceRequest,
  EnvVariable,
  Resource,
  User,
  Workspace,
  WorkspaceMemberWithUser,
  WorkspaceRole,
} from '@developer-lab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';

export type WorkspaceWithDependencies = Workspace & {
  dependencies: Resource[];
};

type WorkspaceAction = 'start' | 'stop' | 'restart';

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
