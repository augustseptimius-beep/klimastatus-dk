import { describe, it, expect } from 'vitest';
import { saneerWidgets } from './validering';
import type { WidgetDefinition } from './types';

const defs: Record<string, WidgetDefinition> = {
  tekstblok: {
    type: 'tekstblok',
    navn: 'Tekst',
    beskrivelse: '',
    ikon: 'Type',
    tilladteBredder: [2, 3, 4],
    standardBredde: 4,
    configFelter: [
      {
        key: 'overskrift',
        type: 'text',
        label: 'Overskrift',
        standard: 'Hej',
      },
    ],
  },
};

describe('saneerWidgets', () => {
  it('fjerner widgets med ukendt type', () => {
    const result = saneerWidgets(
      [{ id: 'a', type: 'findes-ikke', width: 4, enabled: true, config: {} }],
      defs,
    );
    expect(result).toHaveLength(0);
  });

  it('klamper bredde til nærmeste tilladte', () => {
    const result = saneerWidgets(
      [{ id: 'a', type: 'tekstblok', width: 1, enabled: true, config: {} }],
      defs,
    );
    expect(result[0].width).toBe(2); // 1 er ikke tilladt → nærmeste tilladte (2)
  });

  it('udfylder manglende config med standard', () => {
    const result = saneerWidgets(
      [{ id: 'a', type: 'tekstblok', width: 4, enabled: true, config: {} }],
      defs,
    );
    expect(result[0].config.overskrift).toBe('Hej');
  });

  it('fjerner ukendte config-nøgler', () => {
    const result = saneerWidgets(
      [
        {
          id: 'a',
          type: 'tekstblok',
          width: 4,
          enabled: true,
          config: { overskrift: 'X', spam: 1 },
        },
      ],
      defs,
    );
    expect(result[0].config).toEqual({ overskrift: 'X' });
  });

  it('bevarer rækkefølge og enabled-flag', () => {
    const result = saneerWidgets(
      [
        { id: 'a', type: 'tekstblok', width: 4, enabled: false, config: {} },
        { id: 'b', type: 'tekstblok', width: 4, enabled: true, config: {} },
      ],
      defs,
    );
    expect(result.map((w) => w.id)).toEqual(['a', 'b']);
    expect(result[0].enabled).toBe(false);
  });
});
