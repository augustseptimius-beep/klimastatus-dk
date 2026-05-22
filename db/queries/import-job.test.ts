import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRow = {
  id: 'job1',
  kommuneId: 'k1',
  filnavn: 'katalog.pdf',
  filtype: 'pdf',
  filindhold: 'base64data',
  status: 'pending' as const,
  resultat: null,
  fejl: null,
  oprettet: new Date(),
  opdateret: new Date(),
};

const mockReturning = vi.fn().mockResolvedValue([mockRow]);
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

const mockLimit = vi.fn().mockResolvedValue([mockRow]);
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockDbWhere = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn(() => ({ where: mockDbWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));

vi.mock('@/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));
vi.mock('@/db/schema', () => ({ importJob: {} }));

describe('createImportJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([mockRow]);
  });

  it('indsætter row og returnerer den', async () => {
    const { createImportJob } = await import('./import-job');
    const result = await createImportJob({
      kommuneId: 'k1',
      filnavn: 'katalog.pdf',
      filtype: 'pdf',
      filindhold: 'base64data',
    });
    expect(result.id).toBe('job1');
    expect(result.status).toBe('pending');
  });
});

describe('getImportJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([mockRow]);
  });

  it('returnerer row ved korrekt id', async () => {
    const { getImportJob } = await import('./import-job');
    const result = await getImportJob('job1');
    expect(result?.id).toBe('job1');
  });

  it('returnerer undefined ved ukendt id', async () => {
    mockLimit.mockResolvedValue([]);
    const { getImportJob } = await import('./import-job');
    const result = await getImportJob('ukendt');
    expect(result).toBeUndefined();
  });
});

describe('updateImportJobStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('kalder update med korrekt status og tidsstempel', async () => {
    const { updateImportJobStatus } = await import('./import-job');
    await updateImportJobStatus('job1', 'complete', { resultat: { indsatsomraader: [] } });
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'complete', resultat: { indsatsomraader: [] } }),
    );
  });

  it('sætter fejl og nulstiller resultat ved failed', async () => {
    const { updateImportJobStatus } = await import('./import-job');
    await updateImportJobStatus('job1', 'failed', { fejl: 'Timeout' });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', fejl: 'Timeout', resultat: null }),
    );
  });
});
