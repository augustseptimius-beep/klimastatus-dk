import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { indikatorMaaling } from './indikator';

describe('indikator_maaling cyklus-kobling', () => {
  const cfg = getTableConfig(indikatorMaaling);
  const byName = Object.fromEntries(cfg.columns.map((c) => [c.name, c]));

  it('har monitoreringscyklus_id som NOT NULL', () => {
    expect(byName['monitoreringscyklus_id']).toBeDefined();
    expect(byName['monitoreringscyklus_id'].notNull).toBe(true);
  });

  it('beholder aar-kolonnen', () => {
    expect(byName['aar']).toBeDefined();
  });

  it('har unik constraint på (indikator_id, monitoreringscyklus_id)', () => {
    const uniqueCols = cfg.uniqueConstraints.map((u) => u.columns.map((c) => c.name).sort());
    expect(uniqueCols).toContainEqual(['indikator_id', 'monitoreringscyklus_id'].sort());
  });

  it('har IKKE længere unik constraint på (indikator_id, aar)', () => {
    const uniqueCols = cfg.uniqueConstraints.map((u) => u.columns.map((c) => c.name).sort());
    expect(uniqueCols).not.toContainEqual(['aar', 'indikator_id'].sort());
  });
});
