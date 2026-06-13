import type { FastifyInstance } from 'fastify';
import type { WorkspaceStatus } from '@developer-lab/shared';
import { buildTraefikLabels } from '../utils/helpers.js';

export class DockerService {
  constructor(private readonly app: FastifyInstance) {}

  private get docker() {
    return this.app.docker;
  }

  private get sharedNetwork() {
    return this.app.config.labSharedNetwork;
  }

  async ensureSharedNetwork() {
    try {
      await this.docker.getNetwork(this.sharedNetwork).inspect();
    } catch {
      await this.docker.createNetwork({
        Name: this.sharedNetwork,
        Driver: 'bridge',
      });
    }
  }

  async ensureWorkspaceNetwork(key: string) {
    const networkName = `lab-ws-${key}`;

    try {
      await this.docker.getNetwork(networkName).inspect();
    } catch {
      await this.docker.createNetwork({
        Name: networkName,
        Driver: 'bridge',
      });
    }

    return networkName;
  }

  async createWorkspaceContainer(options: {
    key: string;
    image: string;
    port: number;
    cpuLimit?: number | null;
    memoryLimit?: number | null;
    env?: string[];
  }) {
    await this.ensureSharedNetwork();
    const workspaceNetwork = await this.ensureWorkspaceNetwork(options.key);

    const labels = buildTraefikLabels(
      options.key,
      options.port,
      this.app.config.labDomain,
    );

    const container = await this.docker.createContainer({
      name: `lab-ws-${options.key}`,
      Image: options.image,
      Cmd: ['tail', '-f', '/dev/null'],
      Env: options.env ?? [],
      ExposedPorts: {
        [`${options.port}/tcp`]: {},
      },
      Labels: labels,
      HostConfig: {
        NetworkMode: workspaceNetwork,
        NanoCpus: options.cpuLimit ? options.cpuLimit * 1_000_000_000 : undefined,
        Memory: options.memoryLimit ?? undefined,
        RestartPolicy: { Name: 'unless-stopped' },
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [workspaceNetwork]: {},
          [this.sharedNetwork]: {},
        },
      },
    });

    return container;
  }

  async findExistingWorkspaceContainer(key: string) {
    try {
      const container = this.docker.getContainer(`lab-ws-${key}`);
      const info = await container.inspect();

      if (info.State.Restarting || info.RestartCount > 3) {
        await this.removeContainer(container.id);
        return null;
      }

      return container;
    } catch {
      return null;
    }
  }

  async ensureWorkspaceContainer(workspace: {
    key: string;
    image: string | null;
    port: number | null;
    cpuLimit?: number | null;
    memoryLimit?: number | null;
  }) {
    const existing = await this.findExistingWorkspaceContainer(workspace.key);
    if (existing) {
      return existing;
    }

    return this.createWorkspaceContainer({
      key: workspace.key,
      image: workspace.image ?? 'node:22-alpine',
      port: workspace.port ?? 3000,
      cpuLimit: workspace.cpuLimit,
      memoryLimit: workspace.memoryLimit,
    });
  }

  async getContainerRuntimeStatus(containerId: string): Promise<WorkspaceStatus | null> {
    try {
      const info = await this.docker.getContainer(containerId).inspect();

      if (info.State.Restarting) {
        return null;
      }

      if (info.State.Running) {
        return 'running';
      }

      if (info.State.Status === 'created' || info.State.Status === 'exited') {
        return 'stopped';
      }

      return null;
    } catch {
      return null;
    }
  }

  async startContainer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();

    if (info.State.Restarting) {
      await container.kill().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (info.State.Running && !info.State.Restarting) {
      return container;
    }

    await container.start();
    return container;
  }

  async stopContainer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect().catch(() => null);

    if (!info?.State.Running && !info?.State.Restarting) {
      return container;
    }

    if (info.State.Restarting) {
      await container.kill().catch(() => undefined);
      return container;
    }

    await container.stop({ t: 5 }).catch(() => container.kill().catch(() => undefined));
    return container;
  }

  async removeContainer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    await container.stop().catch(() => undefined);
    await container.remove({ force: true }).catch(() => undefined);
  }

  async getContainerLogs(containerId: string, tail = 200) {
    const container = this.docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });

    return logs.toString('utf8');
  }

  async getContainerStats(containerId: string) {
    const container = this.docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });

    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuPercent =
      systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

    const memoryUsage = stats.memory_stats.usage ?? 0;
    const memoryLimit = stats.memory_stats.limit ?? 0;

    return {
      cpuPercent: Number(cpuPercent.toFixed(2)),
      memoryUsage,
      memoryLimit,
      memoryPercent:
        memoryLimit > 0 ? Number(((memoryUsage / memoryLimit) * 100).toFixed(2)) : 0,
    };
  }
}

export function createDockerService(app: FastifyInstance) {
  return new DockerService(app);
}
