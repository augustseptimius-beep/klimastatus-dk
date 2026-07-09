import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/db/queries', () => ({
  createKommune: vi.fn(),
  getKommuneById: vi.fn(),
  deleteKommune: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn().mockResolvedValue({ userId: 'admin-1', role: 'admin', navn: 'Admin', kommuneId: null, kommuneSlug: null }),
}));

describe('createKommuneAction', () => {
  it('returns error for empty kommunekode', async () => {
    const { createKommuneAction } = await import('./actions');
    const formData = new FormData();
    formData.set('kommunekode', '');
    const result = await createKommuneAction(undefined, formData);
    expect(result?.errors?.kommunekode).toBeDefined();
  });

  it('returns error for unknown kommunekode', async () => {
    const { createKommuneAction } = await import('./actions');
    const formData = new FormData();
    formData.set('kommunekode', '999');
    const result = await createKommuneAction(undefined, formData);
    expect(result?.errors?.kommunekode).toBeDefined();
  });

  it('sætter kommunetype fra kommune-listen ved oprettelse', async () => {
    const { createKommune } = await import('@/db/queries');
    const formData = new FormData();
    formData.set('kommunekode', '787'); // Thisted = land
    const { createKommuneAction } = await import('./actions');
    try {
      await createKommuneAction(undefined, formData);
    } catch {
      // redirect() throws i test-miljøet — forventet på happy path
    }
    expect(createKommune).toHaveBeenCalledWith(
      expect.objectContaining({ kommunekode: '787', kommunetype: 'land' }),
    );
  });
});

describe('deleteKommuneAction — kræver indtastet kommunenavn', () => {
  async function setup(kommuneNavn = 'Thisted') {
    const { getKommuneById, deleteKommune } = await import('@/db/queries');
    vi.mocked(getKommuneById).mockResolvedValue({ id: 'k-1', navn: kommuneNavn } as never);
    vi.mocked(deleteKommune).mockClear();
    const { deleteKommuneAction } = await import('./actions');
    return { deleteKommuneAction, deleteKommune };
  }

  it('afviser uden bekræftelsesnavn', async () => {
    const { deleteKommuneAction, deleteKommune } = await setup();
    const fd = new FormData();
    fd.set('id', 'k-1');
    const result = await deleteKommuneAction(undefined, fd);
    expect(result?.message).toContain('Sletning afvist');
    expect(deleteKommune).not.toHaveBeenCalled();
  });

  it('afviser forkert bekræftelsesnavn', async () => {
    const { deleteKommuneAction, deleteKommune } = await setup();
    const fd = new FormData();
    fd.set('id', 'k-1');
    fd.set('bekraeftNavn', 'Thistde'); // tastefejl
    const result = await deleteKommuneAction(undefined, fd);
    expect(result?.message).toContain('Sletning afvist');
    expect(deleteKommune).not.toHaveBeenCalled();
  });

  it('sletter ved præcist navn (med tolerance for whitespace)', async () => {
    const { deleteKommuneAction, deleteKommune } = await setup();
    const fd = new FormData();
    fd.set('id', 'k-1');
    fd.set('bekraeftNavn', '  Thisted  ');
    const result = await deleteKommuneAction(undefined, fd);
    expect(result?.message).toContain('slettet');
    expect(deleteKommune).toHaveBeenCalledWith('k-1');
  });

  it('afviser ukendt kommune-id', async () => {
    const { getKommuneById, deleteKommune } = await import('@/db/queries');
    vi.mocked(getKommuneById).mockResolvedValue(undefined as never);
    vi.mocked(deleteKommune).mockClear();
    const { deleteKommuneAction } = await import('./actions');
    const fd = new FormData();
    fd.set('id', 'findes-ikke');
    fd.set('bekraeftNavn', 'X');
    const result = await deleteKommuneAction(undefined, fd);
    expect(result?.message).toContain('findes ikke');
    expect(deleteKommune).not.toHaveBeenCalled();
  });
});
