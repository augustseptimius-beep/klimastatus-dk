import { describe, it, expect } from 'vitest';
import { initialiserKriterieData, opdaterKriterieText, godkendKriterieInData } from './selvevaluering';

describe('initialiserKriterieData', () => {
  it('returnerer 16 kriterier med status tom', () => {
    const data = initialiserKriterieData('2.5');
    expect(data.kriterier).toHaveLength(16);
    expect(data.kriterier[0].kriterieNr).toBe(1);
    expect(data.kriterier[15].kriterieNr).toBe(16);
    expect(data.kriterier.every(k => k.status === 'tom')).toBe(true);
  });

  it('sætter cctfVersion korrekt', () => {
    const data = initialiserKriterieData('2.5');
    expect(data.cctfVersion).toBe('2.5');
  });
});

describe('opdaterKriterieText', () => {
  it('opdaterer kun tekstfelter, bevarer eksisterende dokumentationshenvisninger', () => {
    const eksisterendeData = initialiserKriterieData('2.5');
    eksisterendeData.kriterier[0].dokumentationshenvisninger = [
      { entitetType: 'tiltag', entitetId: 'abc', label: 'Test tiltag', bemaerkning: null },
    ];
    eksisterendeData.kriterier[0].status = 'godkendt';

    const opdateret = opdaterKriterieText(eksisterendeData, 1, {
      hvadStaarPaa: 'NY TEKST',
      hvadOpdateres: '',
      selvvurdering: '',
      selvvurderingNiveau: '',
    });

    expect(opdateret.kriterier[0].hvadStaarPaa).toBe('NY TEKST');
    // Dokumentationshenvisninger urørte
    expect(opdateret.kriterier[0].dokumentationshenvisninger).toHaveLength(1);
    // Status opdateret fra 'godkendt' → 'redigeret'
    expect(opdateret.kriterier[0].status).toBe('redigeret');
  });

  it('sætter status til redigeret hvis var tom eller ai_udkast', () => {
    const data = initialiserKriterieData('2.5');
    const opdateret = opdaterKriterieText(data, 1, {
      hvadStaarPaa: 'noget',
      hvadOpdateres: '',
      selvvurdering: '',
      selvvurderingNiveau: '',
    });
    expect(opdateret.kriterier[0].status).toBe('redigeret');
  });

  it('sætter status til redigeret når godkendt kriterie ryddes', () => {
    const data = initialiserKriterieData('2.5');
    data.kriterier[0].status = 'godkendt';
    const opdateret = opdaterKriterieText(data, 1, {
      hvadStaarPaa: '',
      hvadOpdateres: '',
      selvvurdering: '',
      selvvurderingNiveau: '',
    });
    // Rydning af godkendt felt sætter til redigeret (kræver re-godkendelse)
    expect(opdateret.kriterier[0].status).toBe('redigeret');
  });

  it('gemmer standardiseret selvvurderingsniveau', () => {
    const data = initialiserKriterieData('2.5');
    const opdateret = opdaterKriterieText(data, 1, {
      hvadStaarPaa: '',
      hvadOpdateres: '',
      selvvurdering: 'Begrundelse',
      selvvurderingNiveau: 'lever_op',
    });
    expect(opdateret.kriterier[0].selvvurderingNiveau).toBe('lever_op');
    expect(opdateret.kriterier[0].selvvurdering).toBe('Begrundelse');
  });
});

describe('godkendKriterieInData', () => {
  it('sætter status godkendt og snapshotter dokRefs', () => {
    const data = initialiserKriterieData('2.5');
    const dokRefs = [{ entitetType: 'tiltag', entitetId: 'abc', label: 'Test', bemaerkning: null }];
    const opdateret = godkendKriterieInData(data, 1, dokRefs);
    expect(opdateret.kriterier[0].status).toBe('godkendt');
    expect(opdateret.kriterier[0].dokumentationshenvisninger).toEqual(dokRefs);
    // Andre kriterier urørte
    expect(opdateret.kriterier[1].status).toBe('tom');
  });
});
