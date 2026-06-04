import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';

describe('kommune.public_widgets', () => {
  it('har en public_widgets jsonb-kolonne', () => {
    const cfg = getTableConfig(kommune);
    const col = cfg.columns.find((c) => c.name === 'public_widgets');
    expect(col).toBeDefined();
    expect(col?.dataType).toBe('json');
  });
});
