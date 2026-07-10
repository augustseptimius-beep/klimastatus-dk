import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/db/schema', () => ({ indikator: {} }));
vi.mock('@/db/queries/indikator-kobling', () => ({
  tilknytIndikatorTiltag: vi.fn(),
  fjernIndikatorTiltag: vi.fn(),
}));
vi.mock('@/db/queries/indikator-template', () => ({ getTemplateById: vi.fn() }));
vi.mock('@/db/queries/tiltag', () => ({ getTiltagById: vi.fn() }));
vi.mock('@/db/queries/kommune-indikator', () => ({
  createKommuneIndikator: vi.fn(),
  setKommuneIndikatorAktiv: vi.fn(),
  getKommuneIndikatorById: vi.fn(),
}));
vi.mock('@/lib/kommune-context', () => ({
  requireKommuneContext: vi.fn().mockResolvedValue({
    session: { userId: 'u1', role: 'koordinator' },
    kommune: { id: 'kommune-a', navn: 'A-købing', subdomain: 'a' },
  }),
}));

describe('tilknytIndikatorTiltagAction — tenant-scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('afviser tiltag der tilhører en anden kommune', async () => {
    const { getKommuneIndikatorById } = await import('@/db/queries/kommune-indikator');
    const { getTiltagById } = await import('@/db/queries/tiltag');
    const { tilknytIndikatorTiltag } = await import('@/db/queries/indikator-kobling');
    vi.mocked(getKommuneIndikatorById).mockResolvedValue(
      { id: 'ki-1', kommuneId: 'kommune-a', indikatorId: 'ind-1' } as never,
    );
    vi.mocked(getTiltagById).mockResolvedValue(
      { id: 'tiltag-fremmed', kommuneId: 'kommune-b' } as never,
    );

    const { tilknytIndikatorTiltagAction } = await import('./actions');
    await tilknytIndikatorTiltagAction('a', 'ki-1', 'tiltag-fremmed');

    expect(tilknytIndikatorTiltag).not.toHaveBeenCalled();
  });

  it('tilknytter tiltag i egen kommune', async () => {
    const { getKommuneIndikatorById } = await import('@/db/queries/kommune-indikator');
    const { getTiltagById } = await import('@/db/queries/tiltag');
    const { tilknytIndikatorTiltag } = await import('@/db/queries/indikator-kobling');
    vi.mocked(getKommuneIndikatorById).mockResolvedValue(
      { id: 'ki-1', kommuneId: 'kommune-a', indikatorId: 'ind-1' } as never,
    );
    vi.mocked(getTiltagById).mockResolvedValue(
      { id: 'tiltag-egen', kommuneId: 'kommune-a' } as never,
    );

    const { tilknytIndikatorTiltagAction } = await import('./actions');
    await tilknytIndikatorTiltagAction('a', 'ki-1', 'tiltag-egen');

    expect(tilknytIndikatorTiltag).toHaveBeenCalledWith('ind-1', 'tiltag-egen');
  });

  it('afviser kommune-indikator fra en anden kommune', async () => {
    const { getKommuneIndikatorById } = await import('@/db/queries/kommune-indikator');
    const { tilknytIndikatorTiltag } = await import('@/db/queries/indikator-kobling');
    vi.mocked(getKommuneIndikatorById).mockResolvedValue(
      { id: 'ki-2', kommuneId: 'kommune-b', indikatorId: 'ind-2' } as never,
    );

    const { tilknytIndikatorTiltagAction } = await import('./actions');
    await tilknytIndikatorTiltagAction('a', 'ki-2', 'tiltag-x');

    expect(tilknytIndikatorTiltag).not.toHaveBeenCalled();
  });
});
