import { describe, it, expect, vi, beforeEach } from 'vitest';

const set = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
const update = vi.fn(() => ({ set }));
vi.mock('@/db', () => ({ db: { update: (...a: unknown[]) => update(...(a as [])) } }));
vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }));

import { updateDashboardWidgets } from './actions';
import { verifySession } from '@/lib/dal';

beforeEach(() => vi.clearAllMocks());

describe('updateDashboardWidgets', () => {
  it('afviser uden session', async () => {
    (verifySession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateDashboardWidgets([]);
    expect(res.ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('saner og gemmer widgets for kommunen', async () => {
    (verifySession as ReturnType<typeof vi.fn>).mockResolvedValue({ kommuneId: 'k1' });
    const res = await updateDashboardWidgets([
      { id: 'a', type: 'tekstblok', width: 9 as never, enabled: true, config: { overskrift: 'Hej', spam: 1 } },
      { id: 'b', type: 'ukendt', width: 4 as never, enabled: true, config: {} },
    ]);
    expect(res.ok).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gemt = (set.mock.calls[0] as any)[0].publicWidgets;
    // ukendt fjernet, bredde klampet, spam fjernet
    expect(gemt).toHaveLength(1);
    expect(gemt[0].type).toBe('tekstblok');
    expect(gemt[0].config).toEqual({ overskrift: 'Hej', tekst: '' });
  });
});
