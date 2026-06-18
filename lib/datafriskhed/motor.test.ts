import { describe, it, expect } from 'vitest';
import { emissionsdataFriskhed, kadenceFriskhed, indikatorFriskhed, delmaalTjek, beregnIndsigter, type IndikatorInput, type MotorInput } from './motor';

const NU = new Date('2026-06-17T00:00:00Z');

describe('emissionsdataFriskhed', () => {
  it('giver intet signal når der ingen emissionsdata er (undgå falsk positiv)', () => {
    expect(emissionsdataFriskhed(null, NU)).toBeNull();
  });

  it('er frisk når seneste år er 0-1 år gammelt', () => {
    expect(emissionsdataFriskhed(2025, NU)?.niveau).toBe('frisk');
    expect(emissionsdataFriskhed(2026, NU)?.niveau).toBe('frisk');
  });

  it('er snart når seneste år er 2 år gammelt', () => {
    const i = emissionsdataFriskhed(2024, NU);
    expect(i?.niveau).toBe('snart');
    expect(i?.type).toBe('emissionsdata');
    expect(i?.besked).toMatch(/2024/);
  });

  it('er forældet når seneste år er 3+ år gammelt', () => {
    expect(emissionsdataFriskhed(2023, NU)?.niveau).toBe('forældet');
    expect(emissionsdataFriskhed(2019, NU)?.niveau).toBe('forældet');
  });

  it('bruger hjælpende sprog uden compliance-ord', () => {
    const i = emissionsdataFriskhed(2022, NU);
    expect(i?.besked).not.toMatch(/fejl|ugyldig|kan ikke godkendes/i);
  });
});

describe('kadenceFriskhed', () => {
  const NU = new Date('2026-06-17T00:00:00Z');

  it('intet signal ved manuel kadence', () => {
    expect(kadenceFriskhed('manuel', new Date('2020-01-01'), NU)).toBeNull();
  });

  it('intet signal når der aldrig er opdateret (ingen måling) — undgå falsk positiv', () => {
    expect(kadenceFriskhed('aarlig', null, NU)).toBeNull();
  });

  it('er frisk når seneste opdatering er inden for intervallet', () => {
    // kvartalsvis = 3 mdr; opdateret for 1 md siden
    expect(kadenceFriskhed('kvartalsvis', new Date('2026-05-17'), NU)?.niveau).toBe('frisk');
  });

  it('er forældet når intervallet er overskredet', () => {
    // aarlig = 12 mdr; seneste opdatering for 2 år siden
    const i = kadenceFriskhed('aarlig', new Date('2024-06-17'), NU);
    expect(i?.niveau).toBe('forældet');
    expect(i?.type).toBe('kadence');
  });

  it('er snart når opdatering nærmer sig (inden for sidste 20% af intervallet)', () => {
    // halvaarlig = 6 mdr; opdateret for ~5,5 md siden → snart
    expect(kadenceFriskhed('halvaarlig', new Date('2026-01-01'), NU)?.niveau).toBe('snart');
  });
});

describe('indikatorFriskhed', () => {
  const NU = new Date('2026-06-17T00:00:00Z');
  const base: IndikatorInput = {
    kommuneIndikatorId: 'ki1', visningsnavn: 'Solceller', kilde: 'energidataservice',
    sidstHentet: new Date('2026-06-10'), sidsteFejl: null, sidsteFejlBesked: null,
    senesteMaalingDato: null, senesteMaalingAar: 2025,
  };

  it('API-indikator frisk når nyligt hentet', () => {
    expect(indikatorFriskhed(base, NU)?.niveau).toBe('frisk');
  });

  it('API-indikator snart når > 35 dage siden hentning', () => {
    expect(indikatorFriskhed({ ...base, sidstHentet: new Date('2026-04-01') }, NU)?.niveau).toBe('snart');
  });

  it('fejl-tilstand → forældet med fejlbesked', () => {
    const i = indikatorFriskhed({ ...base, sidsteFejl: new Date('2026-06-12'), sidsteFejlBesked: 'HTTP 500' }, NU);
    expect(i?.niveau).toBe('forældet');
    expect(i?.besked).toMatch(/HTTP 500/);
  });

  it('manuel indikator vurderes på seneste målings-år (ikke sidstHentet)', () => {
    const manuel: IndikatorInput = {
      ...base, kilde: null, sidstHentet: null,
      senesteMaalingDato: new Date('2024-01-01'), senesteMaalingAar: 2024,
    };
    const i = indikatorFriskhed(manuel, NU);
    expect(i?.niveau).toBe('snart'); // ~2,5 år gammelt
    expect(i?.entitetId).toBe('ki1');
  });

  it('manuel indikator uden nogen måling → intet signal (ikke "afventer for evigt")', () => {
    expect(indikatorFriskhed({ ...base, kilde: null, sidstHentet: null, senesteMaalingDato: null, senesteMaalingAar: null }, NU)).toBeNull();
  });
});

describe('delmaalTjek', () => {
  it('intet signal når der ikke er noget reduktionsmål endnu', () => {
    expect(delmaalTjek(false, 0)).toBeNull();
  });
  it('indsigt når der er et mål men < 2 delmål', () => {
    const i = delmaalTjek(true, 1);
    expect(i?.niveau).toBe('snart');
    expect(i?.type).toBe('delmaal');
  });
  it('intet signal når der er ≥ 2 delmål', () => {
    expect(delmaalTjek(true, 2)).toBeNull();
  });
});

describe('beregnIndsigter', () => {
  const NU = new Date('2026-06-17T00:00:00Z');
  it('samler alle ikke-null signaler', () => {
    const input: MotorInput = {
      senesteEmissionsAar: 2022,
      kadence: 'aarlig',
      senesteDataopdatering: new Date('2024-01-01'),
      indikatorer: [],
      harReduktionsMaal: true,
      antalReduktionsDelmaal: 1,
    };
    const out = beregnIndsigter(input, NU);
    const typer = out.map((i) => i.type);
    expect(typer).toContain('emissionsdata');
    expect(typer).toContain('kadence');
    expect(typer).toContain('delmaal');
  });
});
