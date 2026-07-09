import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// redirect kaster i rigtige Next (NEXT_REDIRECT) — mock samme adfærd, ellers
// ville koden efter redirect køre videre i testen.
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirect(url),
}));

const getMagicLinkByTokenHash = vi.fn();
const markMagicLinkUsed = vi.fn();
vi.mock('@/db/queries/magic-link', () => ({
  getMagicLinkByTokenHash: (...a: unknown[]) => getMagicLinkByTokenHash(...a),
  markMagicLinkUsed: (...a: unknown[]) => markMagicLinkUsed(...a),
  hashToken: (t: string) => `hash(${t})`,
}));

const getTovholderById = vi.fn();
vi.mock('@/db/queries/tovholder', () => ({
  getTovholderById: (...a: unknown[]) => getTovholderById(...a),
}));

const createTovholderSession = vi.fn();
vi.mock('@/lib/tovholder-session', () => ({
  createTovholderSession: (...a: unknown[]) => createTovholderSession(...a),
}));

const omEnUge = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

describe('indloesMagicLinkAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ukendt token → udløbet-side, ingen session', async () => {
    getMagicLinkByTokenHash.mockResolvedValue(undefined);
    const { indloesMagicLinkAction } = await import('./actions');
    await expect(indloesMagicLinkAction('tok')).rejects.toThrow('REDIRECT:/rapport/udloebet');
    expect(createTovholderSession).not.toHaveBeenCalled();
    expect(markMagicLinkUsed).not.toHaveBeenCalled();
  });

  it('brugt token → udløbet-side, ingen session', async () => {
    getMagicLinkByTokenHash.mockResolvedValue({ id: 'l1', tovholderId: 't1', used: true, expiresAt: omEnUge });
    const { indloesMagicLinkAction } = await import('./actions');
    await expect(indloesMagicLinkAction('tok')).rejects.toThrow('REDIRECT:/rapport/udloebet');
    expect(createTovholderSession).not.toHaveBeenCalled();
  });

  it('slettet tovholder → udløbet-side, token ikke forbrugt', async () => {
    getMagicLinkByTokenHash.mockResolvedValue({ id: 'l1', tovholderId: 't1', used: false, expiresAt: omEnUge });
    getTovholderById.mockResolvedValue(undefined);
    const { indloesMagicLinkAction } = await import('./actions');
    await expect(indloesMagicLinkAction('tok')).rejects.toThrow('REDIRECT:/rapport/udloebet');
    expect(markMagicLinkUsed).not.toHaveBeenCalled();
    expect(createTovholderSession).not.toHaveBeenCalled();
  });

  it('gyldigt token → markeres brugt, session sættes (overskriver evt. gammel), → /rapport', async () => {
    getMagicLinkByTokenHash.mockResolvedValue({ id: 'l1', tovholderId: 't1', used: false, expiresAt: omEnUge });
    getTovholderById.mockResolvedValue({ id: 't1', kommuneId: 'k1' });
    const { indloesMagicLinkAction } = await import('./actions');
    await expect(indloesMagicLinkAction('tok')).rejects.toThrow('REDIRECT:/rapport');
    expect(markMagicLinkUsed).toHaveBeenCalledWith('l1');
    expect(createTovholderSession).toHaveBeenCalledWith({ tovholderId: 't1', kommuneId: 'k1' });
  });

  it('token hashes før opslag (DB gemmer aldrig rå tokens)', async () => {
    getMagicLinkByTokenHash.mockResolvedValue(undefined);
    const { indloesMagicLinkAction } = await import('./actions');
    await expect(indloesMagicLinkAction('hemmelig-token')).rejects.toThrow();
    expect(getMagicLinkByTokenHash).toHaveBeenCalledWith('hash(hemmelig-token)');
  });
});
