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

  it('blokerer efter 10 fejlede forsøg på samme email', async () => {
    const { getUserByEmail } = await import('@/db/queries');
    vi.mocked(getUserByEmail).mockClear().mockResolvedValue(undefined);
    const { _ryddAlle } = await import('@/lib/rate-limit');
    _ryddAlle();
    const { login } = await import('./auth');

    const formData = new FormData();
    formData.set('email', 'bruteforce@test.dk');
    formData.set('password', 'gaet-123!');

    for (let i = 0; i < 10; i++) {
      const r = await login(undefined, formData);
      expect(r?.message).toBe('Forkert email eller adgangskode.');
    }
    const blokeret = await login(undefined, formData);
    expect(blokeret?.message).toContain('For mange loginforsøg');
    // getUserByEmail må ikke kaldes for det blokerede forsøg
    expect(vi.mocked(getUserByEmail)).toHaveBeenCalledTimes(10);
    _ryddAlle();
  });

  it('anden email rammes ikke af blokeringen', async () => {
    const { getUserByEmail } = await import('@/db/queries');
    vi.mocked(getUserByEmail).mockResolvedValue(undefined);
    const { _ryddAlle } = await import('@/lib/rate-limit');
    _ryddAlle();
    const { login } = await import('./auth');

    const angriber = new FormData();
    angriber.set('email', 'offer@test.dk');
    angriber.set('password', 'gaet-123!');
    for (let i = 0; i < 10; i++) await login(undefined, angriber);

    const anden = new FormData();
    anden.set('email', 'kollega@test.dk');
    anden.set('password', 'gaet-123!');
    const r = await login(undefined, anden);
    expect(r?.message).toBe('Forkert email eller adgangskode.');
    _ryddAlle();
  });
});
