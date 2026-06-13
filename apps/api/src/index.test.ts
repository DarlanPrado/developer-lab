import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApp } from './app.js';

describe('API health', () => {
  it('returns ok on /health', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok' });

    await app.close();
  });
});

describe('Auth', () => {
  it('registers first user as admin', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Admin User',
        email: 'admin@test.local',
        password: 'secret123',
      },
    });

    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.equal(body.user.role, 'admin');
    assert.ok(body.token);

    await app.close();
  });
});
