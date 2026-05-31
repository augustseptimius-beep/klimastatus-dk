import { describe, it, expect } from 'vitest';
import { beslutningLabel, knytningLabel, BESLUTNINGER } from './laeringspost-types';

describe('beslutningLabel', () => {
  it('oversætter alle beslutninger til dansk', () => {
    expect(beslutningLabel('viderefoeres')).toBe('Videreføres');
    expect(beslutningLabel('justeres')).toBe('Justeres');
    expect(beslutningLabel('udgaar')).toBe('Udgår');
    expect(beslutningLabel('tilfoeres_ressourcer')).toBe('Tilføres ressourcer');
    expect(beslutningLabel('eskaleres')).toBe('Eskaleres');
  });
});

describe('knytningLabel', () => {
  it('oversætter knytningstype til dansk', () => {
    expect(knytningLabel('tiltag')).toBe('Tiltag');
    expect(knytningLabel('indsatsomraade')).toBe('Indsatsområde');
    expect(knytningLabel('maal')).toBe('Mål');
  });
});

describe('BESLUTNINGER', () => {
  it('indeholder alle fem beslutninger i visningsrækkefølge', () => {
    expect(BESLUTNINGER).toEqual([
      'viderefoeres', 'justeres', 'tilfoeres_ressourcer', 'eskaleres', 'udgaar',
    ]);
  });
});
