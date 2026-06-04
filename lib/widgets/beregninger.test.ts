import { describe, it, expect } from 'vitest';
import { reduktionPct, aarTilMaal, aendringPct, maalProgressPct } from './beregninger';

describe('reduktionPct', () => {
  it('beregner procentvis reduktion fra baseline', () => {
    expect(reduktionPct(1000, 700)).toBeCloseTo(30);
  });
  it('returnerer negativt tal når udledning er steget', () => {
    expect(reduktionPct(1000, 1100)).toBeCloseTo(-10);
  });
  it('returnerer 0 ved baseline 0', () => {
    expect(reduktionPct(0, 500)).toBe(0);
  });
});

describe('aarTilMaal', () => {
  it('trækker nuværende år fra mål-år', () => {
    expect(aarTilMaal(2030, 2024)).toBe(6);
  });
});

describe('aendringPct', () => {
  it('beregner ændring fra forrige år', () => {
    expect(aendringPct(200, 180)).toBeCloseTo(-10);
  });
  it('returnerer null ved forrige værdi 0', () => {
    expect(aendringPct(0, 100)).toBeNull();
  });
});

describe('maalProgressPct', () => {
  it('andel af planlagt reduktion der er opnået', () => {
    // baseline 1000 → mål 400 = planlagt reduktion 600; nu 700 = opnået 300 = 50%
    expect(maalProgressPct(1000, 700, 400)).toBeCloseTo(50);
  });
  it('klamper til 0 når udledning er steget', () => {
    expect(maalProgressPct(1000, 1100, 400)).toBe(0);
  });
  it('klamper til 100 når målet er nået/overgået', () => {
    expect(maalProgressPct(1000, 300, 400)).toBe(100);
  });
});
