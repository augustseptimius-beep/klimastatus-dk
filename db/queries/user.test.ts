import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'u1',
          email: 'test@kommune.dk',
          navn: 'Test',
          role: 'koordinator',
          kommuneId: 'k1',
        }),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 'u2', email: 'new@test.dk', navn: 'New', role: 'koordinator' }]),
      })),
    })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));
vi.mock('@/db/schema', () => ({ user: {} }));
vi.mock('@node-rs/argon2', () => ({ hash: vi.fn().mockResolvedValue('hashed') }));

describe('getUserByEmail', () => {
  it('returns user for known email', async () => {
    const { getUserByEmail } = await import('./user');
    const result = await getUserByEmail('test@kommune.dk');
    expect(result?.email).toBe('test@kommune.dk');
  });
});
