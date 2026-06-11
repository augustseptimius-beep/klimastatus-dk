import { describe, it, expect } from 'vitest';
import {
  kriterierForTiltag,
  kriterierForMaal,
  kriterierForIndsatsOmraade,
  kriterierForIndikator,
} from './auto-mapping';

describe('kriterierForTiltag', () => {
  it('alle handlinger dokumenterer kriterie 12', () => {
    expect(kriterierForTiltag({ prioriteretTiltag: false })).toEqual([12]);
    expect(kriterierForTiltag({})).toEqual([12]);
  });

  it('prioriterede handlinger dokumenterer også kriterie 14', () => {
    expect(kriterierForTiltag({ prioriteretTiltag: true })).toEqual([12, 14]);
  });
});

describe('kriterierForMaal', () => {
  it('reduktionsmål → kriterie 8, tilpasningsmål → kriterie 9', () => {
    expect(kriterierForMaal({ kategori: 'reduction' })).toEqual([8]);
    expect(kriterierForMaal({ kategori: 'adaptation' })).toEqual([9]);
  });

  it('kategorier uden entydigt kriterie mappes ikke', () => {
    expect(kriterierForMaal({ kategori: 'co_benefits' })).toEqual([]);
    expect(kriterierForMaal({ kategori: 'consumption' })).toEqual([]);
  });
});

describe('øvrige entiteter', () => {
  it('indsatsområde → kriterie 11, indikator uden skabelon → kriterie 15', () => {
    expect(kriterierForIndsatsOmraade()).toEqual([11]);
    expect(kriterierForIndikator()).toEqual([15]);
    expect(kriterierForIndikator({ cctfKriterier: [] })).toEqual([15]);
  });

  it('indikator med skabelon-kriterier får dem plus MERL (15), uden dubletter', () => {
    expect(kriterierForIndikator({ cctfKriterier: [6, 11] })).toEqual([6, 11, 15]);
    expect(kriterierForIndikator({ cctfKriterier: [6, 15] })).toEqual([6, 15]);
  });
});
