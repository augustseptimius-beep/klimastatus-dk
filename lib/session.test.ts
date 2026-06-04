import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('session encryption', () => {
  it('round-trips a payload', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-32-chars-longg';
    const { encrypt, decrypt } = await import('./session');
    const payload = {
      userId: 'user-1',
      kommuneId: 'kom-1',
      kommuneSlug: null,
      role: 'koordinator' as const,
      navn: 'Test',
      expiresAt: new Date(Date.now() + 1000 * 60),
    };
    const token = await encrypt(payload);
    expect(typeof token).toBe('string');
    const result = await decrypt(token);
    expect(result?.userId).toBe('user-1');
    expect(result?.role).toBe('koordinator');
  });

  it('returns undefined for invalid token', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-32-chars-longg';
    const { decrypt } = await import('./session');
    const result = await decrypt('not-a-valid-token');
    expect(result).toBeUndefined();
  });
});
