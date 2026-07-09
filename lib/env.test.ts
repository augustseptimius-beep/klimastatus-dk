import { describe, it, expect } from 'vitest';
import { tjekEnv } from './env';

const fuldOpsaetning = {
  DATABASE_URL: 'postgres://x:y@db:5432/z',
  SESSION_SECRET: 'a'.repeat(44),
  BREVO_API_KEY: 'key',
  ANTHROPIC_API_KEY: 'key',
  KLIMAREGNSKABET_API_KEY: 'key',
};

describe('tjekEnv', () => {
  it('ingen fejl ved fuld opsætning', () => {
    const r = tjekEnv(fuldOpsaetning);
    expect(r.fatale).toEqual([]);
    expect(r.advarsler).toEqual([]);
  });

  it('DATABASE_URL mangler → fatal', () => {
    const r = tjekEnv({ ...fuldOpsaetning, DATABASE_URL: undefined });
    expect(r.fatale.some((f) => f.includes('DATABASE_URL'))).toBe(true);
  });

  it('SESSION_SECRET mangler → fatal', () => {
    const r = tjekEnv({ ...fuldOpsaetning, SESSION_SECRET: undefined });
    expect(r.fatale.some((f) => f.includes('SESSION_SECRET'))).toBe(true);
  });

  it('for kort SESSION_SECRET → fatal', () => {
    const r = tjekEnv({ ...fuldOpsaetning, SESSION_SECRET: 'kort' });
    expect(r.fatale.some((f) => f.includes('32 tegn'))).toBe(true);
  });

  it('manglende API-nøgler → advarsler, ikke fatale', () => {
    const r = tjekEnv({
      DATABASE_URL: fuldOpsaetning.DATABASE_URL,
      SESSION_SECRET: fuldOpsaetning.SESSION_SECRET,
    });
    expect(r.fatale).toEqual([]);
    expect(r.advarsler).toHaveLength(3);
  });
});
