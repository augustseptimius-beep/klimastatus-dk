import { describe, it, expect, vi, beforeEach } from 'vitest';

const onConflictDoNothing = vi.fn().mockReturnValue({
  returning: vi.fn().mockResolvedValue([]),
});
const insertValues = vi.fn().mockReturnValue({ onConflictDoNothing });
const insert = vi.fn().mockReturnValue({ values: insertValues });
const findFirst = vi.fn();

vi.mock('@/db', () => ({
  db: {
    insert: (...a: unknown[]) => insert(...a),
    query: { monitoreringscyklus: { findFirst: (...a: unknown[]) => findFirst(...a) } },
  },
}));

vi.mock('@/db/schema', () => ({
  monitoreringscyklus: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

import { ensureAarligCyklus } from './monitorering';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ensureAarligCyklus', () => {
  it('returnerer eksisterende cyklus uden at oprette en ny', async () => {
    const existing = { id: 'c1', kommuneId: 'k1', aar: 2025, type: 'aarlig' };
    findFirst.mockResolvedValueOnce(existing);

    const result = await ensureAarligCyklus('k1', 2025);

    expect(result.id).toBe('c1');
    expect(insert).not.toHaveBeenCalled();
  });

  it('opretter en ny cyklus når ingen findes, med korrekt navn/type/status', async () => {
    findFirst.mockResolvedValueOnce(undefined);
    onConflictDoNothing.mockReturnValueOnce({
      returning: vi.fn().mockResolvedValue([{ id: 'c2', kommuneId: 'k1', aar: 2026 }]),
    });

    const result = await ensureAarligCyklus('k1', 2026);

    expect(insert).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        kommuneId: 'k1',
        aar: 2026,
        type: 'aarlig',
        navn: 'Årsstatus 2026',
        status: 'aaben',
      }),
    );
    expect(result.id).toBe('c2');
  });

  it('håndterer race: hvis insert intet returnerer (konflikt), slår op igen', async () => {
    findFirst.mockResolvedValueOnce(undefined); // første opslag: ingen
    onConflictDoNothing.mockReturnValueOnce({
      returning: vi.fn().mockResolvedValue([]), // konflikt → tom
    });
    findFirst.mockResolvedValueOnce({ id: 'c3', kommuneId: 'k1', aar: 2027 }); // andet opslag

    const result = await ensureAarligCyklus('k1', 2027);

    expect(result.id).toBe('c3');
  });
});
