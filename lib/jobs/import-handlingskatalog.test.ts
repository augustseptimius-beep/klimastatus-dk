import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockJob = {
  id: 'job1',
  kommuneId: 'k1',
  filnavn: 'katalog.pdf',
  filtype: 'pdf',
  filindhold: 'base64pdfdata',
  status: 'pending' as const,
  resultat: null,
  fejl: null,
  oprettet: new Date(),
  opdateret: new Date(),
};

const mockGetImportJob = vi.fn().mockResolvedValue(mockJob);
const mockUpdateImportJobStatus = vi.fn().mockResolvedValue(undefined);

vi.mock('@/db/queries/import-job', () => ({
  getImportJob: mockGetImportJob,
  updateImportJobStatus: mockUpdateImportJobStatus,
}));

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropicConstructor {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropicConstructor };
});

describe('handleImportHandlingskatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetImportJob.mockResolvedValue(mockJob);
    mockUpdateImportJobStatus.mockResolvedValue(undefined);
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('kaster fejl hvis job ikke findes', async () => {
    mockGetImportJob.mockResolvedValueOnce(undefined);
    const { handleImportHandlingskatalog } = await import('./import-handlingskatalog');
    await expect(handleImportHandlingskatalog({ importJobId: 'ukendt' })).rejects.toThrow('ikke fundet');
  });

  it('sætter status processing, derefter complete ved succes', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', input: { indsatsomraader: [{ navn: 'Energi', type: 'ghg_reduction', sektor: 'energy', handlinger: [] }] } }],
    });
    const { handleImportHandlingskatalog } = await import('./import-handlingskatalog');
    await handleImportHandlingskatalog({ importJobId: 'job1' });

    expect(mockUpdateImportJobStatus).toHaveBeenCalledWith('job1', 'processing');
    expect(mockUpdateImportJobStatus).toHaveBeenCalledWith('job1', 'complete', {
      resultat: expect.objectContaining({ indsatsomraader: expect.any(Array) }),
    });
  });

  it('sætter status failed hvis AI ikke returnerer tool_use', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'noget tekst' }] });
    const { handleImportHandlingskatalog } = await import('./import-handlingskatalog');
    await handleImportHandlingskatalog({ importJobId: 'job1' });

    expect(mockUpdateImportJobStatus).toHaveBeenCalledWith('job1', 'failed', {
      fejl: expect.stringContaining('struktureret data'),
    });
  });

  it('sætter status failed ved AI-undtagelse', async () => {
    mockCreate.mockRejectedValue(new Error('network timeout'));
    const { handleImportHandlingskatalog } = await import('./import-handlingskatalog');
    await handleImportHandlingskatalog({ importJobId: 'job1' });

    expect(mockUpdateImportJobStatus).toHaveBeenCalledWith('job1', 'failed', {
      fejl: expect.stringContaining('network timeout'),
    });
  });
});
