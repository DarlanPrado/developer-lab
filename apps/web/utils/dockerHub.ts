const DOCKER_HUB_BASE = '/docker-hub/v2';
const REPO_LIMIT = 5;
const TAGS_PER_REPO = 8;
const MAX_RESULTS = 30;

export type DockerImageOption = {
  label: string;
  value: string;
  description?: string;
};

type HubSearchResponse = {
  results: Array<{
    repo_name: string;
    short_description: string;
    is_official: boolean;
  }>;
};

type HubTagsResponse = {
  results: Array<{ name: string }>;
};

export const POPULAR_DOCKER_IMAGES: DockerImageOption[] = [
  { label: 'node:22-alpine', value: 'node:22-alpine', description: 'Node.js Alpine' },
  { label: 'node:20-alpine', value: 'node:20-alpine', description: 'Node.js Alpine' },
  { label: 'python:3.12-slim', value: 'python:3.12-slim', description: 'Python slim' },
  { label: 'python:3.11-slim', value: 'python:3.11-slim', description: 'Python slim' },
  { label: 'golang:1.22-alpine', value: 'golang:1.22-alpine', description: 'Go Alpine' },
  { label: 'nginx:alpine', value: 'nginx:alpine', description: 'Nginx Alpine' },
  { label: 'redis:alpine', value: 'redis:alpine', description: 'Redis Alpine' },
  { label: 'postgres:16-alpine', value: 'postgres:16-alpine', description: 'PostgreSQL Alpine' },
];

async function fetchHub<T>(path: string): Promise<T> {
  return $fetch<T>(`${DOCKER_HUB_BASE}${path}`);
}

export async function searchDockerHubImages(query: string): Promise<DockerImageOption[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return POPULAR_DOCKER_IMAGES;
  }

  const colonIndex = trimmed.indexOf(':');
  const repoQuery = colonIndex >= 0 ? trimmed.slice(0, colonIndex) : trimmed;
  const tagQuery = colonIndex >= 0 ? trimmed.slice(colonIndex + 1) : undefined;

  if (!repoQuery.trim()) {
    return POPULAR_DOCKER_IMAGES;
  }

  const search = await fetchHub<HubSearchResponse>(
    `/search/repositories/?query=${encodeURIComponent(repoQuery.trim())}&page_size=${REPO_LIMIT}`,
  );

  const images: DockerImageOption[] = [];
  const seen = new Set<string>();

  await Promise.all(
    search.results.map(async (repo) => {
      const repoPath = repo.is_official
        ? `library/${repo.repo_name}`
        : repo.repo_name;

      const tagParams = new URLSearchParams({
        page_size: String(TAGS_PER_REPO),
      });

      if (tagQuery?.trim()) {
        tagParams.set('name', tagQuery.trim());
      } else {
        tagParams.set('ordering', '-last_updated');
      }

      try {
        const tags = await fetchHub<HubTagsResponse>(
          `/repositories/${repoPath}/tags?${tagParams.toString()}`,
        );

        for (const tag of tags.results) {
          const value = `${repo.repo_name}:${tag.name}`;
          if (seen.has(value)) continue;

          seen.add(value);
          images.push({
            label: value,
            value,
            description: repo.short_description || undefined,
          });
        }
      } catch {
        // Ignora repos que falharem ao buscar tags.
      }
    }),
  );

  return images.slice(0, MAX_RESULTS);
}
