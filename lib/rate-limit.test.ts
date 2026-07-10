import { describe, it, expect, beforeEach } from 'vitest';
import { erBlokeret, registrerFejletForsoeg, nulstilForsoeg, _ryddAlle } from './rate-limit';

const T0 = 1_000_000_000;
const MIN = 60 * 1000;

describe('login rate limiter', () => {
  beforeEach(() => _ryddAlle());

  it('blokerer ikke uden fejl', () => {
    expect(erBlokeret('a@b.dk', T0)).toBe(false);
  });

  it('blokerer ikke under 10 fejl', () => {
    for (let i = 0; i < 9; i++) registrerFejletForsoeg('a@b.dk', T0 + i);
    expect(erBlokeret('a@b.dk', T0 + 10)).toBe(false);
  });

  it('blokerer ved 10 fejl inden for vinduet', () => {
    for (let i = 0; i < 10; i++) registrerFejletForsoeg('a@b.dk', T0 + i);
    expect(erBlokeret('a@b.dk', T0 + 11)).toBe(true);
  });

  it('slipper fri når vinduet (15 min) er udløbet', () => {
    for (let i = 0; i < 10; i++) registrerFejletForsoeg('a@b.dk', T0);
    expect(erBlokeret('a@b.dk', T0 + 16 * MIN)).toBe(false);
  });

  it('succesfuldt login nulstiller', () => {
    for (let i = 0; i < 10; i++) registrerFejletForsoeg('a@b.dk', T0);
    nulstilForsoeg('a@b.dk');
    expect(erBlokeret('a@b.dk', T0 + 1)).toBe(false);
  });

  it('nøgler er uafhængige', () => {
    for (let i = 0; i < 10; i++) registrerFejletForsoeg('a@b.dk', T0);
    expect(erBlokeret('c@d.dk', T0 + 1)).toBe(false);
  });
});
