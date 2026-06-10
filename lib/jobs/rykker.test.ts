import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/db/schema', () => ({ magicLink: {}, tovholder: {}, tovholderRapport: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), gt: vi.fn(), and: vi.fn() }));
vi.mock('@/db/queries/magic-link', () => ({ refreshMagicLink: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendRykkerEmail: vi.fn() }));
vi.mock('@/db/queries', () => ({ getKommuneById: vi.fn() }));

const DAG = 24 * 60 * 60 * 1000;
const now = new Date('2026-06-10T09:00:00Z');
const dageSiden = (n: number) => new Date(now.getTime() - n * DAG);

describe('skalRykkes', () => {
  it('rykker ikke før der er gået 7 dage fra linket blev sendt', async () => {
    const { skalRykkes } = await import('./rykker');
    expect(skalRykkes({ createdAt: dageSiden(1), rykkerAntal: 0, sidstRykketAt: null }, now)).toBe(false);
    expect(skalRykkes({ createdAt: dageSiden(6), rykkerAntal: 0, sidstRykketAt: null }, now)).toBe(false);
  });

  it('rykker første gang efter 7 dage uden svar', async () => {
    const { skalRykkes } = await import('./rykker');
    expect(skalRykkes({ createdAt: dageSiden(7), rykkerAntal: 0, sidstRykketAt: null }, now)).toBe(true);
    expect(skalRykkes({ createdAt: dageSiden(30), rykkerAntal: 0, sidstRykketAt: null }, now)).toBe(true);
  });

  it('venter 7 dage mellem rykkere — ingen daglig spam', async () => {
    const { skalRykkes } = await import('./rykker');
    expect(skalRykkes({ createdAt: dageSiden(8), rykkerAntal: 1, sidstRykketAt: dageSiden(1) }, now)).toBe(false);
    expect(skalRykkes({ createdAt: dageSiden(14), rykkerAntal: 1, sidstRykketAt: dageSiden(7) }, now)).toBe(true);
  });

  it('stopper efter 2 rykkere uanset hvor lang tid der går', async () => {
    const { skalRykkes } = await import('./rykker');
    expect(skalRykkes({ createdAt: dageSiden(60), rykkerAntal: 2, sidstRykketAt: dageSiden(30) }, now)).toBe(false);
    expect(skalRykkes({ createdAt: dageSiden(60), rykkerAntal: 3, sidstRykketAt: dageSiden(30) }, now)).toBe(false);
  });
});
