import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./session', () => ({
  decrypt: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(() => ({ value: 'mock-token' })) })),
}));
vi.mock('@/db', () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn(),
      },
    },
  },
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));
vi.mock('@/db/schema', () => ({
  user: {},
}));

describe('verifySession', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null when no token', async () => {
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(() => ({ get: vi.fn(() => undefined) })),
    }));
    vi.doMock('./session', () => ({
      decrypt: vi.fn().mockResolvedValue(undefined),
    }));
    const { verifySession } = await import('./dal');
    const result = await verifySession();
    expect(result).toBeNull();
  });

  it('returns null when token is invalid', async () => {
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(() => ({ get: vi.fn(() => ({ value: 'bad-token' })) })),
    }));
    vi.doMock('./session', () => ({
      decrypt: vi.fn().mockResolvedValue(undefined),
    }));
    const { verifySession } = await import('./dal');
    const result = await verifySession();
    expect(result).toBeNull();
  });
});
