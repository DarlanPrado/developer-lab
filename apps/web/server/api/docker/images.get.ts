import {
  POPULAR_DOCKER_IMAGES,
  searchDockerHubImages,
} from '~/utils/dockerHub';

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event);
  const query = typeof q === 'string' ? q.trim() : '';

  if (query.length >= 2) {
    return searchDockerHubImages(query);
  }

  return POPULAR_DOCKER_IMAGES;
});
