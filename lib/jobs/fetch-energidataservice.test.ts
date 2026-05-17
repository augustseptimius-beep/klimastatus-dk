import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockKI = {
  id: 'ki2',
  kommuneId: 'k1',
  indikatorId: 'ind2',
  templateId: 'tmpl2',
  sidstHentet: null,
  template: { kilde: 'energidataservice', apiQuery: '{}' },
  kommune: { kommunekode: '773' },
};

const mockEdsResponse = {
  records: [
    { MunicipalityNo: 773, Month: '2024-01', OnshoreWindMW: 150.5, SolarPowerMW: 45.2 },
    { MunicipalityNo: 773, Month: '2023-12', OnshoreWindMW: 148.0, SolarPowerMW: 44.0 },
    { MunicipalityNo: 101, Month: '2024-01', OnshoreWindMW: 0, SolarPowerMW: 10.0 },
  ],
};

const mockGetActiveKommuneIndikatorer = vi.fn().mockResolvedValue([mockKI]);
const mockUpdateSidstHentet = vi.fn().mockResolvedValue(undefined);
const mockUpdateSidsteFejl = vi.fn().mockResolvedValue(undefined);

vi.mock('@/db/queries/kommune-indikator', () => ({
  getActiveKommuneIndikatorer: mockGetActiveKommuneIndikatorer,
  updateSidstHentet: mockUpdateSidstHentet,
  updateSidsteFejl: mockUpdateSidsteFejl,
}));

const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

vi.mock('@/db', () => ({
  db: {
    insert: mockInsert,
  },
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }));
vi.mock('@/db/schema', () => ({
  indikatorMaaling: {},
}));

vi.mock('./fetch-utils', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

describe('getLatestByMunicipality', () => {
  it('returns most recent record per municipality', async () => {
    const { getLatestByMunicipality } = await import('./fetch-energidataservice');
    const result = getLatestByMunicipality(mockEdsResponse.records);

    // 773 should have the 2024-01 record (most recent)
    expect(result[773]).toEqual({
      MunicipalityNo: 773,
      Month: '2024-01',
      OnshoreWindMW: 150.5,
      SolarPowerMW: 45.2,
    });

    // 101 should have its one record
    expect(result[101]).toEqual({
      MunicipalityNo: 101,
      Month: '2024-01',
      OnshoreWindMW: 0,
      SolarPowerMW: 10.0,
    });
  });

  it('handles empty records array', async () => {
    const { getLatestByMunicipality } = await import('./fetch-energidataservice');
    const result = getLatestByMunicipality([]);
    expect(result).toEqual({});
  });
});

describe('handleFetchEnergidataservice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveKommuneIndikatorer.mockResolvedValue([mockKI]);
    mockUpdateSidstHentet.mockResolvedValue(undefined);
    mockUpdateSidsteFejl.mockResolvedValue(undefined);
    mockOnConflictDoUpdate.mockResolvedValue(undefined);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEdsResponse),
    }));
  });

  it('fetches all records in ONE call and inserts totalMW for matching municipality', async () => {
    const { handleFetchEnergidataservice } = await import('./fetch-energidataservice');
    await handleFetchEnergidataservice();

    expect(mockGetActiveKommuneIndikatorer).toHaveBeenCalledWith('energidataservice');

    // API should be called exactly once (not per-kommune)
    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Should insert with totalMW = 150.5 + 45.2 = 195.7 for 2024
    expect(mockValues).toHaveBeenCalledWith({
      indikatorId: 'ind2',
      aar: 2024,
      vaerdi: 150.5 + 45.2,
      kilde: 'energidataservice',
      autoHentet: true,
    });

    expect(mockUpdateSidstHentet).toHaveBeenCalledWith('ki2', expect.any(Date));
  });

  it('filters by kommuneIndikatorId when provided', async () => {
    const { handleFetchEnergidataservice } = await import('./fetch-energidataservice');
    await handleFetchEnergidataservice({ kommuneIndikatorId: 'ki2' });

    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockUpdateSidstHentet).toHaveBeenCalledWith('ki2', expect.any(Date));
  });

  it('does nothing if kommuneIndikatorId is not in active list', async () => {
    const { handleFetchEnergidataservice } = await import('./fetch-energidataservice');
    await handleFetchEnergidataservice({ kommuneIndikatorId: 'nonexistent' });

    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockUpdateSidstHentet).not.toHaveBeenCalled();
  });

  it('calls updateSidsteFejl for all filtered targets on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { handleFetchEnergidataservice } = await import('./fetch-energidataservice');
    await handleFetchEnergidataservice();

    expect(mockUpdateSidsteFejl).toHaveBeenCalledWith('ki2', 'Network error');
    expect(mockUpdateSidstHentet).not.toHaveBeenCalled();
  });

  it('returns early if no active targets', async () => {
    mockGetActiveKommuneIndikatorer.mockResolvedValue([]);

    const { handleFetchEnergidataservice } = await import('./fetch-energidataservice');
    await handleFetchEnergidataservice();

    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
