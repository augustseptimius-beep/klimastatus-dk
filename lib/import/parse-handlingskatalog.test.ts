import { describe, it, expect } from 'vitest';
import { parseHandlingskatalog } from './parse-handlingskatalog';

const r = (o: Record<string, string>) => o;

describe('parseHandlingskatalog', () => {
  it('grupperer rækker med samme indsatsområde til ét område med flere handlinger', () => {
    const { indsatser, advarsler } = parseHandlingskatalog([
      r({ 'Indsatsområde': 'Energi', 'Indsats-type': 'Drivhusgasreduktion', 'Sektor': 'Energi', 'Tiltag-titel': 'Solceller', 'Tiltag-type': 'Reduktion', 'Tiltag-status': 'Planlagt' }),
      r({ 'Indsatsområde': 'Energi', 'Indsats-type': 'Drivhusgasreduktion', 'Sektor': 'Energi', 'Tiltag-titel': 'Efterisolering', 'Tiltag-type': 'Reduktion', 'Tiltag-status': 'Igangværende' }),
    ]);
    expect(advarsler).toHaveLength(0);
    expect(indsatser).toHaveLength(1);
    expect(indsatser[0]).toMatchObject({ navn: 'Energi', type: 'ghg_reduction', sektor: 'energy' });
    expect(indsatser[0].handlinger).toHaveLength(2);
    expect(indsatser[0].handlinger[1]).toMatchObject({ titel: 'Efterisolering', status: 'in_progress' });
  });

  it('springer helt tomme rækker over uden advarsel', () => {
    const { indsatser, advarsler } = parseHandlingskatalog([
      r({ 'Indsatsområde': '', 'Tiltag-titel': '' }),
    ]);
    expect(indsatser).toHaveLength(0);
    expect(advarsler).toHaveLength(0);
  });

  it('advarer og springer over ved manglende påkrævet felt', () => {
    const { indsatser, advarsler } = parseHandlingskatalog([
      r({ 'Indsatsområde': 'Energi', 'Indsats-type': 'Drivhusgasreduktion', 'Sektor': 'Energi', 'Tiltag-titel': '', 'Tiltag-type': 'Reduktion', 'Tiltag-status': 'Planlagt' }),
    ]);
    expect(indsatser).toHaveLength(0);
    expect(advarsler[0]).toContain('tiltag-titel');
  });

  it('advarer og springer over ved ukendt enum-værdi', () => {
    const { advarsler } = parseHandlingskatalog([
      r({ 'Indsatsområde': 'Energi', 'Indsats-type': 'Drivhusgasreduktion', 'Sektor': 'Rumfart', 'Tiltag-titel': 'X', 'Tiltag-type': 'Reduktion', 'Tiltag-status': 'Planlagt' }),
    ]);
    expect(advarsler[0]).toContain('sektor');
  });

  it('tager indsats-beskrivelse og tiltag-beskrivelse med når de findes', () => {
    const { indsatser } = parseHandlingskatalog([
      r({ 'Indsatsområde': 'Energi', 'Indsats-type': 'Drivhusgasreduktion', 'Sektor': 'Energi', 'Indsats-beskrivelse': 'Tema', 'Tiltag-titel': 'Solceller', 'Tiltag-type': 'Reduktion', 'Tiltag-status': 'Planlagt', 'Tiltag-beskrivelse': 'På tage' }),
    ]);
    expect(indsatser[0].beskrivelse).toBe('Tema');
    expect(indsatser[0].handlinger[0].beskrivelse).toBe('På tage');
  });
});
