import { describe, it, expect } from 'vitest';
import { resolveSeedPassword } from './seed-guard';

describe('resolveSeedPassword', () => {
  it('bruger env-værdi når den er sat', () => {
    const r = resolveSeedPassword({ envNavn: 'ADMIN_PASSWORD', envVaerdi: 'superhemmeligt', fallback: 'admin123!', erProduktion: true });
    expect(r).toEqual({ password: 'superhemmeligt', fejl: null });
  });

  it('bruger fallback i udvikling når env mangler', () => {
    const r = resolveSeedPassword({ envNavn: 'ADMIN_PASSWORD', envVaerdi: undefined, fallback: 'admin123!', erProduktion: false });
    expect(r).toEqual({ password: 'admin123!', fejl: null });
  });

  it('afviser fallback i produktion når env mangler', () => {
    const r = resolveSeedPassword({ envNavn: 'ADMIN_PASSWORD', envVaerdi: undefined, fallback: 'admin123!', erProduktion: true });
    expect(r.password).toBeNull();
    expect(r.fejl).toContain('ADMIN_PASSWORD');
  });

  it('afviser tom streng i produktion', () => {
    const r = resolveSeedPassword({ envNavn: 'SEED_PASSWORD', envVaerdi: '', fallback: 'x', erProduktion: true });
    expect(r.password).toBeNull();
  });

  it('afviser for korte passwords uanset miljø', () => {
    const r = resolveSeedPassword({ envNavn: 'ADMIN_PASSWORD', envVaerdi: 'kort', fallback: 'x', erProduktion: false });
    expect(r.password).toBeNull();
    expect(r.fejl).toContain('under 8 tegn');
  });
});
