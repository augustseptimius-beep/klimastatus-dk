import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('@/db/queries/indikator-template', () => ({
  createTemplate: vi.fn(),
  setTemplateAktiv: vi.fn(),
}));

// requireAdmin styres pr. test. Selve requireAdmin-logikken testes i lib/dal.test.ts —
// her verificeres at hver action faktisk kalder guarden og stopper ved afvisning.
const requireAdmin = vi.fn();
vi.mock('@/lib/dal', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

function gyldigFormData(): FormData {
  const fd = new FormData();
  fd.set('titel', 'Test-indikator');
  fd.set('kilde', 'dst');
  fd.set('apiQuery', '{"tabel":"FOLK1A"}');
  fd.set('enhed', 'antal');
  fd.set('beskrivelse', 'En testbeskrivelse');
  fd.set('cctfKriterier', '6,11');
  return fd;
}

const adminSession = { userId: 'u1', role: 'admin', kommuneId: null, kommuneSlug: null, navn: 'A' };

describe('admin indikator-actions kræver admin-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createTemplateAction afviser når requireAdmin kaster', async () => {
    requireAdmin.mockRejectedValue(new Error('Ikke autoriseret'));
    const { createTemplateAction } = await import('./actions');
    const { createTemplate } = await import('@/db/queries/indikator-template');
    await expect(createTemplateAction(undefined, gyldigFormData())).rejects.toThrow('Ikke autoriseret');
    expect(createTemplate).not.toHaveBeenCalled();
  });

  it('createTemplateAction virker for admin', async () => {
    requireAdmin.mockResolvedValue(adminSession);
    const { createTemplateAction } = await import('./actions');
    const { createTemplate } = await import('@/db/queries/indikator-template');
    const result = await createTemplateAction(undefined, gyldigFormData());
    expect(result?.errors).toBeUndefined();
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(createTemplate).toHaveBeenCalledOnce();
  });

  it('toggleTemplateAktivAction afviser når requireAdmin kaster', async () => {
    requireAdmin.mockRejectedValue(new Error('Ikke autoriseret'));
    const { toggleTemplateAktivAction } = await import('./actions');
    const { setTemplateAktiv } = await import('@/db/queries/indikator-template');
    await expect(toggleTemplateAktivAction('id-1', false)).rejects.toThrow('Ikke autoriseret');
    expect(setTemplateAktiv).not.toHaveBeenCalled();
  });

  it('toggleTemplateAktivAction virker for admin', async () => {
    requireAdmin.mockResolvedValue(adminSession);
    const { toggleTemplateAktivAction } = await import('./actions');
    const { setTemplateAktiv } = await import('@/db/queries/indikator-template');
    await toggleTemplateAktivAction('id-1', false);
    expect(setTemplateAktiv).toHaveBeenCalledWith('id-1', false);
  });
});
