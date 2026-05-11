// db/queries/magic-link.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: { magicLink: { findFirst: vi.fn().mockResolvedValue({ id: 'ml1', tokenHash: 'abc', tovholderId: 'th1', expiresAt: new Date(Date.now() + 1000000), used: false }) } },
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));
vi.mock('@/db/schema', () => ({ magicLink: {} }));

describe('generateToken', () => {
  it('returns a 64-char hex string', async () => {
    const { generateToken } = await import('./magic-link');
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it('returns unique tokens on each call', async () => {
    const { generateToken } = await import('./magic-link');
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });
});

describe('hashToken', () => {
  it('returns deterministic SHA-256 hex', async () => {
    const { hashToken } = await import('./magic-link');
    const h1 = hashToken('abc');
    const h2 = hashToken('abc');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it('returns different hashes for different inputs', async () => {
    const { hashToken } = await import('./magic-link');
    expect(hashToken('abc')).not.toBe(hashToken('def'));
  });
});

describe('createMagicLink', () => {
  it('returns a 64-char hex token', async () => {
    const { createMagicLink } = await import('./magic-link');
    const token = await createMagicLink('th1');
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it('calls insert with hashed token and tovholderId', async () => {
    const { db } = await import('@/db');
    const { createMagicLink } = await import('./magic-link');
    await createMagicLink('th1');
    const insertMock = vi.mocked(db.insert);
    expect(insertMock).toHaveBeenCalled();
    const lastCallIndex = insertMock.mock.results.length - 1;
    const valuesMock = insertMock.mock.results[lastCallIndex].value.values;
    const lastValuesCallIndex = valuesMock.mock.calls.length - 1;
    const callArg = valuesMock.mock.calls[lastValuesCallIndex][0];
    expect(callArg.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(callArg.tovholderId).toBe('th1');
    expect(callArg.expiresAt).toBeInstanceOf(Date);
  });
});

describe('getMagicLinkByTokenHash', () => {
  it('returns the magic link record', async () => {
    const { getMagicLinkByTokenHash } = await import('./magic-link');
    const result = await getMagicLinkByTokenHash('abc');
    expect(result?.id).toBe('ml1');
    expect(result?.used).toBe(false);
  });
});

describe('markMagicLinkUsed', () => {
  it('calls update without throwing', async () => {
    const { markMagicLinkUsed } = await import('./magic-link');
    await expect(markMagicLinkUsed('ml1')).resolves.toBeUndefined();
  });

  it('calls db.update with used: true', async () => {
    const { db } = await import('@/db');
    const { markMagicLinkUsed } = await import('./magic-link');
    await markMagicLinkUsed('ml1');
    const updateMock = vi.mocked(db.update);
    expect(updateMock).toHaveBeenCalled();
    const setMock = updateMock.mock.results[0].value.set;
    expect(setMock).toHaveBeenCalledWith({ used: true });
  });
});
