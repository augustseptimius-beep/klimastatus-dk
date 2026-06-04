import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedirect = vi.fn();
const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => { mockRedirect(...args); throw new Error('redirect'); },
  notFound: () => { mockNotFound(); throw new Error('notFound'); },
}));

const mockVerifySession = vi.fn();
vi.mock('@/lib/dal', () => ({ verifySession: () => mockVerifySession() }));

const mockGetKommuneBySubdomain = vi.fn();
vi.mock('@/db/queries/kommune', () => ({
  getKommuneBySubdomain: (slug: string) => mockGetKommuneBySubdomain(slug),
}));

import { requireKommuneContext } from './kommune-context';

const adminSession = {
  userId: 'u1', kommuneId: null, kommuneSlug: null,
  role: 'admin' as const, navn: 'Admin', expiresAt: new Date(),
};
const koordinatorSession = {
  userId: 'u2', kommuneId: 'k1', kommuneSlug: 'groenkobing',
  role: 'koordinator' as const, navn: 'Kord', expiresAt: new Date(),
};
const groenkobing = { id: 'k1', subdomain: 'groenkobing', navn: 'Grønkøbing', primaryColor: '#1a5c38' };
const herning = { id: 'k2', subdomain: 'herning', navn: 'Herning', primaryColor: null };

beforeEach(() => vi.clearAllMocks());

describe('requireKommuneContext', () => {
  it('admin + vilkårlig kommune → returnerer kontekst', async () => {
    mockVerifySession.mockResolvedValue(adminSession);
    mockGetKommuneBySubdomain.mockResolvedValue(herning);
    const ctx = await requireKommuneContext('herning');
    expect(ctx.kommune.id).toBe('k2');
    expect(ctx.session.role).toBe('admin');
  });

  it('koordinator + egen kommune → returnerer kontekst', async () => {
    mockVerifySession.mockResolvedValue(koordinatorSession);
    mockGetKommuneBySubdomain.mockResolvedValue(groenkobing);
    const ctx = await requireKommuneContext('groenkobing');
    expect(ctx.kommune.id).toBe('k1');
  });

  it('koordinator + fremmed kommune → notFound', async () => {
    mockVerifySession.mockResolvedValue(koordinatorSession);
    mockGetKommuneBySubdomain.mockResolvedValue(herning);
    await expect(requireKommuneContext('herning')).rejects.toThrow('notFound');
  });

  it('ingen session → redirect til /login', async () => {
    mockVerifySession.mockResolvedValue(null);
    mockGetKommuneBySubdomain.mockResolvedValue(groenkobing);
    await expect(requireKommuneContext('groenkobing')).rejects.toThrow('redirect');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('ukendt slug → notFound', async () => {
    mockVerifySession.mockResolvedValue(adminSession);
    mockGetKommuneBySubdomain.mockResolvedValue(undefined);
    await expect(requireKommuneContext('ukendt')).rejects.toThrow('notFound');
  });
});
