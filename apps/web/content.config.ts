import { defineCollection, defineContentConfig } from '@nuxt/content';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: {
        cwd: resolve(rootDir, 'docs'),
        include: '**/*.md',
        prefix: '/docs',
      },
    }),
  },
});
