import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCsvNormal = `OMRÅDE;TID;INDHOLD\r\n773;2023;44814\r\n773;2022;45100\r\n`;
const mockCsvMissing = `OMRÅDE;TID;INDHOLD\r\n773;2023;..\r\n773;2022;x\r\n`;
const mockCsvComma = `OMRÅDE;TID;INDHOLD\r\n773;2023;1,5\r\n`;

const mockKI = {
  id: 'ki1',
  kommuneId: 'k1',
  indikatorId: 'ind1',
  templateId: 'tmpl1',
  sidstHentet: null,
  template: {
    kilde: 'dst',
    apiQuery: JSON.stringify({ tabel: 'FOLK1A', variabler: { KØN: 'TOT', ALDER: 'IALT' }, felt: 'INDHOLD' }),
  },
  kommune: { kommunekode: '773' },
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

describe('parseDstCsv', () => {
  it('parses normal CSV correctly', async () => {
    const { parseDstCsv } = await import('./fetch-dst');
    const result = parseDstCsv(mockCsvNormal, 'INDHOLD');
    expect(result[2023]).toBe(44814);
    expect(result[2022]).toBe(45100);
  });

  it('converts missing-data codes to null', async () => {
    const { parseDstCsv } = await import('./fetch-dst');
    const result = parseDstCsv(mockCsvMissing, 'INDHOLD');
    expect(result[2023]).toBeNull();
    expect(result[2022]).toBeNull();
  });

  it('handles comma decimals', async () => {
    const { parseDstCsv } = await import('./fetch-dst');
    const result = parseDstCsv(mockCsvComma, 'INDHOLD');
    expect(result[2023]).toBe(1.5);
  });
});

describe('handleFetchDst', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveKommuneIndikatorer.mockResolvedValue([mockKI]);
    mockUpdateSidstHentet.mockResolvedValue(undefined);
    mockUpdateSidsteFejl.mockResolvedValue(undefined);
    mockOnConflictDoUpdate.mockResolvedValue(undefined);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockCsvNormal),
    }));
  });

  it('POSTs to DST API with correct payload including OMRÅDE filter, skips null values when inserting', async () => {
    const { handleFetchDst } = await import('./fetch-dst');
    await handleFetchDst();

    expect(mockGetActiveKommuneIndikatorer).toHaveBeenCalledWith('dst');

    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.statbank.dk/v1/data');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body.table).toBe('FOLK1A');
    expect(body.format).toBe('CSV');

    // OMRÅDE variable must be present with kommunekode
    const omraadeVar = body.variables.find((v: { code: string }) => v.code === 'OMRÅDE');
    expect(omraadeVar).toBeDefined();
    expect(omraadeVar.values).toContain('773');

    // Should insert non-null values (2023→44814, 2022→45100)
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ aar: 2023, vaerdi: 44814, kilde: 'dst', autoHentet: true }),
    );
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ aar: 2022, vaerdi: 45100, kilde: 'dst', autoHentet: true }),
    );

    // Null values must NOT be inserted — use missing CSV to verify skipping
    vi.clearAllMocks();
    mockGetActiveKommuneIndikatorer.mockResolvedValue([mockKI]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockCsvMissing),
    }));

    await handleFetchDst();
    // No inserts should happen for null values
    expect(mockValues).not.toHaveBeenCalled();

    expect(mockUpdateSidstHentet).toHaveBeenCalledWith('ki1', expect.any(Date));
  });
});
