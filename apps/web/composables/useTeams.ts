import type { Team, TeamMemberWithUser } from '@developer-lab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';

interface CreateTeamRequest {
  name: string;
  description?: string;
}

interface AddTeamMemberRequest {
  userId: string;
  role?: 'owner' | 'member';
}

export function useTeamsQuery() {
  const { api } = useApi();
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => api<Team[]>('/teams'),
  });
}

export function useTeamMembersQuery(teamId: MaybeRefOrGetter<string | undefined>) {
  const { api } = useApi();
  return useQuery({
    queryKey: computed(() => ['teams', toValue(teamId), 'members']),
    queryFn: () =>
      api<TeamMemberWithUser[]>(`/teams/${toValue(teamId)}/members`),
    enabled: computed(() => !!toValue(teamId)),
  });
}

export function useCreateTeamMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTeamRequest) =>
      api<Team>('/teams', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useAddTeamMemberMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      body,
    }: {
      teamId: string;
      body: AddTeamMemberRequest;
    }) => api<TeamMemberWithUser>(`/teams/${teamId}/members`, { method: 'POST', body }),
    onSuccess: (_data, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId, 'members'] });
    },
  });
}

export function useRemoveTeamMemberMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      api<void>(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: (_data, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId, 'members'] });
    },
  });
}
