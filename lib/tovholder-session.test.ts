import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));

describe('encryptTovholder / decryptTovholder', () => {
  it('round-trips a payload', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-32-chars-longg';
    const { encryptTovholder, decryptTovholder } = await import('./tovholder-session');
    const payload = { tovholderId: 'th-1', kommuneId: 'k-1', expiresAt: new Date(Date.now() + 60000) };
    const token = await encryptTovholder(payload);
    expect(typeof token).toBe('string');
    const result = await decryptTovholder(token);
    expect(result?.tovholderId).toBe('th-1');
    expect(result?.kommuneId).toBe('k-1');
  });

  it('returns undefined for invalid token', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-32-chars-longg';
    const { decryptTovholder } = await import('./tovholder-session');
    expect(await decryptTovholder('not-valid')).toBeUndefined();
  });
});
