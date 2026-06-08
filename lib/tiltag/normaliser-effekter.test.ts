import { describe, it, expect } from 'vitest';
import { normaliserEffekter } from './normaliser-effekter';

describe('normaliserEffekter', () => {
  it('beholder en struktureret række med kategori + værdi + enhed', () => {
    const r = normaliserEffekter([
      { kategori: 'co2_reduktion', vaerdi: 5000, enhed: 'ton CO₂e/år', beskrivelse: '' },
    ]);
    expect(r).toEqual([
      { kategori: 'co2_reduktion', vaerdi: 5000, enhed: 'ton CO₂e/år', beskrivelse: null, sortering: 0 },
    ]);
  });

  it('beholder en fritekst-række (kategori null, beskrivelse sat)', () => {
    const r = normaliserEffekter([
      { kategori: null, vaerdi: null, enhed: '', beskrivelse: 'Bedre luftkvalitet i centrum' },
    ]);
    expect(r).toEqual([
      { kategori: null, vaerdi: null, enhed: null, beskrivelse: 'Bedre luftkvalitet i centrum', sortering: 0 },
    ]);
  });

  it('dropper en helt tom række', () => {
    const r = normaliserEffekter([
      { kategori: null, vaerdi: null, enhed: '', beskrivelse: '' },
    ]);
    expect(r).toEqual([]);
  });

  it('dropper en fritekst-række uden beskrivelse', () => {
    const r = normaliserEffekter([
      { kategori: null, vaerdi: null, enhed: '', beskrivelse: '   ' },
    ]);
    expect(r).toEqual([]);
  });

  it('beholder struktureret række med kun kategori + værdi (enhed tom)', () => {
    const r = normaliserEffekter([
      { kategori: 'klimatilpasning', vaerdi: 200, enhed: '', beskrivelse: '' },
    ]);
    expect(r).toEqual([
      { kategori: 'klimatilpasning', vaerdi: 200, enhed: null, beskrivelse: null, sortering: 0 },
    ]);
  });

  it('dropper struktureret række uden hverken værdi eller enhed eller beskrivelse', () => {
    const r = normaliserEffekter([
      { kategori: 'klimatilpasning', vaerdi: null, enhed: '', beskrivelse: '' },
    ]);
    expect(r).toEqual([]);
  });

  it('tildeler sortering efter rækkefølge og bevarer den efter filtrering', () => {
    const r = normaliserEffekter([
      { kategori: 'co2_reduktion', vaerdi: 100, enhed: 't', beskrivelse: '' },
      { kategori: null, vaerdi: null, enhed: '', beskrivelse: '' }, // droppes
      { kategori: 'sidegevinst', vaerdi: null, enhed: '', beskrivelse: 'Støjreduktion' },
    ]);
    expect(r.map((e) => e.sortering)).toEqual([0, 1]);
    expect(r[1].beskrivelse).toBe('Støjreduktion');
  });

  it('behandler NaN som null (ingen ugyldig vaerdi)', () => {
    const r = normaliserEffekter([
      { kategori: 'co2_reduktion', vaerdi: NaN, enhed: 'ton', beskrivelse: '' },
    ]);
    expect(r).toEqual([
      { kategori: 'co2_reduktion', vaerdi: null, enhed: 'ton', beskrivelse: null, sortering: 0 },
    ]);
  });

  it('behandler Infinity som null', () => {
    const r = normaliserEffekter([
      { kategori: 'sidegevinst', vaerdi: Infinity, enhed: '', beskrivelse: 'Klimafordel' },
    ]);
    expect(r).toEqual([
      { kategori: 'sidegevinst', vaerdi: null, enhed: null, beskrivelse: 'Klimafordel', sortering: 0 },
    ]);
  });
});
