import { buildApp, config } from './app.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
