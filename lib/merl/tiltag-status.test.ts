import { describe, it, expect } from 'vitest';
import { tiltagStatusVisning } from './tiltag-status';

describe('tiltagStatusVisning', () => {
  const iDag = '2026-06-09';

  it('mapper enum til dansk label og farve', () => {
    expect(tiltagStatusVisning('planned', null, iDag)).toMatchObject({ label: 'Ikke startet', forsinket: false });
    expect(tiltagStatusVisning('in_progress', null, iDag)).toMatchObject({ label: 'I gang' });
    expect(tiltagStatusVisning('completed', null, iDag)).toMatchObject({ label: 'Gennemført' });
    expect(tiltagStatusVisning('discontinued', null, iDag)).toMatchObject({ label: 'Udgået' });
  });

  it('markerer forsinket når tidsramme er udløbet og status ikke er afsluttet', () => {
    const r = tiltagStatusVisning('in_progress', '2026-01-01', iDag);
    expect(r.forsinket).toBe(true);
  });

  it('markerer IKKE forsinket når gennemført, selv hvis tidsramme udløbet', () => {
    expect(tiltagStatusVisning('completed', '2026-01-01', iDag).forsinket).toBe(false);
    expect(tiltagStatusVisning('discontinued', '2026-01-01', iDag).forsinket).toBe(false);
  });

  it('markerer IKKE forsinket når tidsramme er i fremtiden eller mangler', () => {
    expect(tiltagStatusVisning('in_progress', '2026-12-01', iDag).forsinket).toBe(false);
    expect(tiltagStatusVisning('in_progress', null, iDag).forsinket).toBe(false);
  });
});
