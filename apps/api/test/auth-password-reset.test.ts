import { describe, expect, test } from 'bun:test';
import { prisma } from '@botttle/db';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/modules/auth/service.js';

function testDbUrl(): string | null {
  const url = process.env['DATABASE_URL']?.trim();
  return url ? url : null;
}

describe('auth forgot/reset password', () => {
  test('forgot-password does not reveal account existence', async () => {
    if (!testDbUrl()) return;
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'does-not-exist@example.com' },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
  });

  test('reset-password rejects invalid token', async () => {
    if (!testDbUrl()) return;
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'invalid-token-that-is-long-enough-1234567890', newPassword: 'new-password-123' },
    });
    expect(res.statusCode).toBe(400);
    const json = res.json();
    expect(json.success).toBe(false);
  });

  test('reset-password updates password for valid token record', async () => {
    if (!testDbUrl()) return;

    const user = await prisma.user.create({
      data: { email: `test-${Date.now()}@example.com`, passwordHash: await hashPassword('old-password-123'), role: 'CLIENT' },
      select: { id: true, email: true },
    });

    const token = 'test-token-' + Date.now();
    const tokenHash = await (async () => {
      const crypto = await import('node:crypto');
      return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
    })();

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token, newPassword: 'new-password-123' },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
  });
});

