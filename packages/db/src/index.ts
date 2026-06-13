import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

export * from './schema.js';

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(dbPath: string) {
  mkdirSync(dirname(dbPath), { recursive: true });

  const client = createClient({
    url: `file:${dbPath}`,
  });

  return drizzle(client, { schema });
}

export function runMigrations(db: Database, migrationsFolder?: string) {
  const defaultFolder = join(
    fileURLToPath(new URL('.', import.meta.url)),
    '../drizzle',
  );

  migrate(db, { migrationsFolder: migrationsFolder ?? defaultFolder });
}
