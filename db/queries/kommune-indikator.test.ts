import { describe, it, expect, vi } from 'vitest';

const mockKI = {
  id: 'ki1',
  kommuneId: 'k1',
  templateId: 'tmpl1',
  indikatorId: 'ind1',
  visningsnavn: null,
  aktiv: true,
  sidstHentet: null,
  sidsteFejl: null,
  sidsteFejlBesked: null,
  createdAt: new Date(),
};

const mockActiveRow = {
  ...mockKI,
  template: { kilde: 'dst', apiQuery: 'FOLK1A' },
  kommune: { kommunekode: '787' },
};

vi.mock('@/db', () => ({
  db: {
    query: {
      kommuneIndikator: {
        findFirst: vi.fn().mockResolvedValue(mockKI),
        findMany: vi.fn().mockResolvedValue([mockKI]),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([mockActiveRow]),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([mockKI]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }));
vi.mock('@/db/schema', () => ({
  kommuneIndikator: {},
  indikatorTemplate: {},
  kommune: {},
}));

describe('getKommuneIndikatorById', () => {
  it('returns record by id', async () => {
    const { getKommuneIndikatorById } = await import('./kommune-indikator');
    const result = await getKommuneIndikatorById('ki1');
    expect(result).toBeDefined();
    expect(result!.id).toBe('ki1');
  });
});

describe('getKommuneIndikatorer', () => {
  it('returns records for kommune', async () => {
    const { getKommuneIndikatorer } = await import('./kommune-indikator');
    const result = await getKommuneIndikatorer('k1');
    expect(result).toHaveLength(1);
    expect(result[0].kommuneId).toBe('k1');
  });
});

describe('getActiveKommuneIndikatorer', () => {
  it('returns active records for a kilde', async () => {
    const { getActiveKommuneIndikatorer } = await import('./kommune-indikator');
    const result = await getActiveKommuneIndikatorer('dst');
    expect(result).toHaveLength(1);
    expect(result[0].template.kilde).toBe('dst');
    expect(result[0].kommune.kommunekode).toBe('787');
  });
});

describe('createKommuneIndikator', () => {
  it('inserts and returns record', async () => {
    const { createKommuneIndikator } = await import('./kommune-indikator');
    const result = await createKommuneIndikator({
      kommuneId: 'k1',
      templateId: 'tmpl1',
      indikatorId: 'ind1',
    });
    expect(result).toBeDefined();
    expect(result.id).toBe('ki1');
  });
});

describe('updateSidstHentet', () => {
  it("doesn't throw", async () => {
    const { updateSidstHentet } = await import('./kommune-indikator');
    await expect(updateSidstHentet('ki1', new Date())).resolves.not.toThrow();
  });
});

describe('updateSidsteFejl', () => {
  it("doesn't throw", async () => {
    const { updateSidsteFejl } = await import('./kommune-indikator');
    await expect(updateSidsteFejl('ki1', 'timeout')).resolves.not.toThrow();
  });
});
