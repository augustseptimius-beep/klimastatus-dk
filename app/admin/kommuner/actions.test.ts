import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/db/queries', () => ({
  createKommune: vi.fn(),
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
  it('returns error for empty navn', async () => {
    const { createKommuneAction } = await import('./actions');
    const formData = new FormData();
    formData.set('navn', '');
    formData.set('kommunekode', '773');
    const result = await createKommuneAction(undefined, formData);
    expect(result?.errors?.navn).toBeDefined();
  });

  it('returns error for empty kommunekode', async () => {
    const { createKommuneAction } = await import('./actions');
    const formData = new FormData();
    formData.set('navn', 'Thisted');
    formData.set('kommunekode', '');
    const result = await createKommuneAction(undefined, formData);
    expect(result?.errors?.kommunekode).toBeDefined();
  });
});
