import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db/queries', () => ({
  getUserByEmail: vi.fn(),
}));
vi.mock('@node-rs/argon2', () => ({
  verify: vi.fn(),
}));
vi.mock('@/lib/session', () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('login', () => {
  it('returns error for invalid email format', async () => {
    const { login } = await import('./auth');
    const formData = new FormData();
    formData.set('email', 'not-an-email');
    formData.set('password', 'password123!');
    const result = await login(undefined, formData);
    expect(result?.errors?.email).toBeDefined();
  });

  it('returns error when user not found', async () => {
    const { getUserByEmail } = await import('@/db/queries');
    vi.mocked(getUserByEmail).mockResolvedValueOnce(undefined);
    const { login } = await import('./auth');
    const formData = new FormData();
    formData.set('email', 'user@test.dk');
    formData.set('password', 'ValidPass1!');
    const result = await login(undefined, formData);
    expect(result?.message).toBe('Forkert email eller adgangskode.');
  });
});
