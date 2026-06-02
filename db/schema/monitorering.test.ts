import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { monitoreringscyklus } from './monitorering';

describe('monitoreringscyklus schema', () => {
  const cfg = getTableConfig(monitoreringscyklus);
  const colNames = cfg.columns.map((c) => c.name);

  it('har de forventede kolonner', () => {
    expect(colNames).toEqual(
      expect.arrayContaining([
        'id', 'kommune_id', 'navn', 'periode_start', 'periode_slut',
        'type', 'aar', 'status', 'created_at', 'updated_at',
      ]),
    );
  });

  it('har kommune_id og navn og type som NOT NULL', () => {
    const byName = Object.fromEntries(cfg.columns.map((c) => [c.name, c]));
    expect(byName['kommune_id'].notNull).toBe(true);
    expect(byName['navn'].notNull).toBe(true);
    expect(byName['type'].notNull).toBe(true);
    expect(byName['status'].notNull).toBe(true);
  });

  it('har aar som nullable', () => {
    const byName = Object.fromEntries(cfg.columns.map((c) => [c.name, c]));
    expect(byName['aar'].notNull).toBe(false);
  });

  it('har unik constraint på (kommune_id, type, aar)', () => {
    const uniqueCols = cfg.uniqueConstraints.map((u) => u.columns.map((c) => c.name).sort());
    expect(uniqueCols).toContainEqual(['aar', 'kommune_id', 'type'].sort());
  });
});
