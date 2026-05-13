import { describe, it, expect, vi } from 'vitest';

const mockTemplate = {
  id: 'tmpl1',
  titel: 'Samlet CO₂e pr. capita',
  kilde: 'klimaregnskab' as const,
  apiQuery: '{"type":"Nøgletal","sektor":"Samlet"}',
  enhed: 'ton CO₂e/indb.',
  beskrivelse: 'Kommunens samlede drivhusgasudledning',
  cctfKriterier: [6, 11],
  aktiv: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock('@/db', () => ({
  db: {
    query: {
      indikatorTemplate: {
        findMany: vi.fn().mockResolvedValue([mockTemplate]),
        findFirst: vi.fn().mockResolvedValue(mockTemplate),
      },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([mockTemplate]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ ...mockTemplate, aktiv: false }]) })) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), asc: vi.fn() }));
vi.mock('@/db/schema', () => ({ indikatorTemplate: {} }));

describe('getAllTemplates', () => {
  it('returns all templates', async () => {
    const { getAllTemplates } = await import('./indikator-template');
    const result = await getAllTemplates();
    expect(result[0].titel).toBe('Samlet CO₂e pr. capita');
  });
});

describe('getActiveTemplates', () => {
  it('returns active templates', async () => {
    const { getActiveTemplates } = await import('./indikator-template');
    const result = await getActiveTemplates();
    expect(result[0].aktiv).toBe(true);
  });
});

describe('getTemplateById', () => {
  it('returns a single template by id', async () => {
    const { getTemplateById } = await import('./indikator-template');
    const result = await getTemplateById('tmpl1');
    expect(result).toBeDefined();
    expect(result.id).toBe('tmpl1');
    expect(result.titel).toBe('Samlet CO₂e pr. capita');
  });
});

describe('createTemplate', () => {
  it('inserts and returns new template', async () => {
    const { createTemplate } = await import('./indikator-template');
    const result = await createTemplate({
      titel: 'Samlet CO₂e pr. capita',
      kilde: 'klimaregnskab',
      apiQuery: '{"type":"Nøgletal","sektor":"Samlet"}',
      enhed: 'ton CO₂e/indb.',
      beskrivelse: 'Kommunens samlede drivhusgasudledning',
      cctfKriterier: [6, 11],
    });
    expect(result.id).toBe('tmpl1');
    expect(result.titel).toBe('Samlet CO₂e pr. capita');
  });
});

describe('setTemplateAktiv', () => {
  it('updates aktiv and returns updated template', async () => {
    const { setTemplateAktiv } = await import('./indikator-template');
    const result = await setTemplateAktiv('tmpl1', false);
    expect(result).toBeDefined();
    expect(result.id).toBe('tmpl1');
    expect(result.aktiv).toBe(false);
  });
});
