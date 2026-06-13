import type { GlobalRole, User } from '@developer-lab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: GlobalRole;
}

export function useUsersQuery() {
  const { api } = useApi();
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api<User[]>('/users'),
  });
}

export function useCreateUserMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserRequest) =>
      api<User>('/users', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
