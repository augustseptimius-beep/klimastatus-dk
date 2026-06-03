import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockKI = {
  id: 'ki1',
  kommuneId: 'k1',
  indikatorId: 'ind1',
  templateId: 'tmpl1',
  sidstHentet: null,
  template: { kilde: 'klimaregnskab', apiQuery: '{"type":"Nøgletal","sektor":"Samlet"}' },
  kommune: { kommunekode: '773' },
};

const mockApiResponse = {
  data: [
    { year: 2023, sector: 'Samlet', value: 4.2, unit: 'Ton CO2e' },
    { year: 2022, sector: 'Samlet', value: 4.5, unit: 'Ton CO2e' },
    { year: 2023, sector: 'Energi', value: 1.2, unit: 'Ton CO2e' },
  ],
};

const mockGetActiveKommuneIndikatorer = vi.fn().mockResolvedValue([mockKI]);
const mockUpdateSidstHentet = vi.fn().mockResolvedValue(undefined);
const mockUpdateSidsteFejl = vi.fn().mockResolvedValue(undefined);

vi.mock('@/db/queries/kommune-indikator', () => ({
  getActiveKommuneIndikatorer: mockGetActiveKommuneIndikatorer,
  updateSidstHentet: mockUpdateSidstHentet,
  updateSidsteFejl: mockUpdateSidsteFejl,
  getKommuneIndikatorById: vi.fn(),
}));

const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate, onConflictDoNothing: mockOnConflictDoNothing }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

vi.mock('@/db', () => ({
  db: {
    insert: mockInsert,
  },
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }));
vi.mock('@/db/schema', () => ({
  indikatorMaaling: {},
  drivhusgasregnskabPost: {},
}));

vi.mock('./fetch-utils', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock('@/db/queries/monitorering', () => ({
  ensureAarligCyklus: vi.fn().mockResolvedValue({ id: 'cyklus-test', kommuneId: 'k1', aar: 2024 }),
}));

describe('parseSamletCo2e', () => {
  it('extracts max Samlet value per year and ignores other sectors', async () => {
    const { parseSamletCo2e } = await import('./fetch-klimaregnskabet');
    const result = parseSamletCo2e(mockApiResponse.data);
    expect(result[2023]).toBe(4.2);
    expect(result[2022]).toBe(4.5);
    // Energi sector should not appear as a key
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('takes max when multiple Samlet rows exist for same year', async () => {
    const { parseSamletCo2e } = await import('./fetch-klimaregnskabet');
    const data = [
      { year: 2023, sector: 'Samlet', value: 3.0, unit: 'Ton CO2e' },
      { year: 2023, sector: 'Samlet', value: 4.2, unit: 'Ton CO2e' },
    ];
    const result = parseSamletCo2e(data);
    expect(result[2023]).toBe(4.2);
  });
});

describe('handleFetchKlimaregnskabet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveKommuneIndikatorer.mockResolvedValue([mockKI]);
    mockUpdateSidstHentet.mockResolvedValue(undefined);
    mockUpdateSidsteFejl.mockResolvedValue(undefined);
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockOnConflictDoNothing.mockResolvedValue(undefined);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    }));
  });

  it('fetches data for all active kommuneIndikatorer with correct url and api-key header', async () => {
    process.env.KLIMAREGNSKABET_API_KEY = 'test-key';
    const { handleFetchKlimaregnskabet } = await import('./fetch-klimaregnskabet');
    await handleFetchKlimaregnskabet();

    expect(mockGetActiveKommuneIndikatorer).toHaveBeenCalledWith('klimaregnskab');

    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).toHaveBeenCalled();

    // Verify at least one call contains municipality=773 and x-api-key header
    const calls = fetchMock.mock.calls;
    const hasCorrectCall = calls.some(([url, init]) => {
      const urlStr = typeof url === 'string' ? url : String(url);
      const headers = (init as RequestInit | undefined)?.headers as Record<string, string> | undefined;
      return urlStr.includes('municipality=773') && headers?.['x-api-key'] === 'test-key';
    });
    expect(hasCorrectCall).toBe(true);

    expect(mockUpdateSidstHentet).toHaveBeenCalledWith('ki1', expect.any(Date));
  });

  it('only fetches for the specified kommuneIndikatorId', async () => {
    process.env.KLIMAREGNSKABET_API_KEY = 'test-key';
    const { handleFetchKlimaregnskabet } = await import('./fetch-klimaregnskabet');
    await handleFetchKlimaregnskabet({ kommuneIndikatorId: 'ki1' });

    expect(mockGetActiveKommuneIndikatorer).toHaveBeenCalledWith('klimaregnskab');

    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).toHaveBeenCalled();
    expect(mockUpdateSidstHentet).toHaveBeenCalledWith('ki1', expect.any(Date));
  });

  it('does nothing if kommuneIndikatorId is not in active list', async () => {
    const { handleFetchKlimaregnskabet } = await import('./fetch-klimaregnskabet');
    await handleFetchKlimaregnskabet({ kommuneIndikatorId: 'nonexistent' });

    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockUpdateSidstHentet).not.toHaveBeenCalled();
  });
});
