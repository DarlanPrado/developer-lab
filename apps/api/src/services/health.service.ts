import { eq } from 'drizzle-orm';
import { resources } from '@developer-lab/db/schema';
import type { FastifyInstance } from 'fastify';
import { request as httpRequest } from 'node:https';
import { request as httpRequestHttp } from 'node:http';

async function checkEndpoint(endpoint: string): Promise<'online' | 'degraded' | 'offline'> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `http://${endpoint}`;
    const parsed = new URL(url);

    return await new Promise((resolve) => {
      const client = parsed.protocol === 'https:' ? httpRequest : httpRequestHttp;
      const req = client(
        {
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path: parsed.pathname === '/' ? '/' : parsed.pathname,
          method: 'GET',
          timeout: 5000,
        },
        (res) => {
          resolve(res.statusCode && res.statusCode < 500 ? 'online' : 'degraded');
        },
      );

      req.on('error', () => resolve('offline'));
      req.on('timeout', () => {
        req.destroy();
        resolve('offline');
      });

      req.end();
    });
  } catch {
    return 'offline';
  }
}

export class HealthService {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly app: FastifyInstance) {}

  start(intervalMs = 30_000) {
    if (this.timer) return;

    void this.runChecks();
    this.timer = setInterval(() => void this.runChecks(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runChecks() {
    const allResources = await this.app.db.select().from(resources);

    for (const resource of allResources) {
      const status = await checkEndpoint(resource.endpoint);

      if (status !== resource.status) {
        await this.app.db
          .update(resources)
          .set({ status })
          .where(eq(resources.id, resource.id));
      }
    }
  }
}

export function createHealthService(app: FastifyInstance) {
  return new HealthService(app);
}
