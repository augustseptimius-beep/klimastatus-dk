import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), inArray: vi.fn() }));
vi.mock('@/db/schema', () => ({
  kommuneIndikator: {}, indikatorTemplate: {}, indikatorMaaling: {}, tiltagEffekt: {},
}));
vi.mock('@/db/queries', () => ({ getAllIndsatsOmraader: vi.fn(), getAllTovholdere: vi.fn() }));
vi.mock('@/db/queries/tiltag', () => ({ getAllTiltag: vi.fn(), getCo2SumForTiltag: vi.fn() }));
vi.mock('@/db/queries/maal', () => ({ getUfuldstaendigeReduktionsMaal: vi.fn(), getReduktionsMaal: vi.fn() }));
vi.mock('@/db/queries/rapport', () => ({ getLatestRapporterForTovholder: vi.fn() }));
vi.mock('@/db/queries/laeringspost', () => ({ getBarriereInbox: vi.fn(), getLaeringsposter: vi.fn() }));

describe('beregnStatusFordeling', () => {
  it('tæller pr. status og ignorerer ukendte', async () => {
    const { beregnStatusFordeling } = await import('./statusnotat');
    const result = beregnStatusFordeling([
      'planned', 'in_progress', 'in_progress', 'completed', 'discontinued', 'ukendt',
    ]);
    expect(result).toEqual({ planned: 1, in_progress: 2, completed: 1, discontinued: 1 });
  });

  it('returnerer nuller for tom liste', async () => {
    const { beregnStatusFordeling } = await import('./statusnotat');
    expect(beregnStatusFordeling([])).toEqual({
      planned: 0, in_progress: 0, completed: 0, discontinued: 0,
    });
  });
});
