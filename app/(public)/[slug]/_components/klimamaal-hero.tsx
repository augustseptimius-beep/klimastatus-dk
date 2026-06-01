'use client';

import { useState } from 'react';
import { JaarToggle } from './jaar-toggle';
import type { Co2eDataPoint } from '@/db/queries/public-dashboard';

type Props = {
  kommuneNavn: string;
  maalAar: number | null;
  co2eSerie: Co2eDataPoint[];
};

export function KlimamaalHero({ kommuneNavn, maalAar, co2eSerie }: Props) {
  const tilgaengeligeAar = co2eSerie
    .map((d) => d.aar)
    .filter((a): a is number => a !== null);

  const [valgteAar, setValgteAar] = useState<number>(
    tilgaengeligeAar[tilgaengeligeAar.length - 1] ?? new Date().getFullYear(),
  );

  const valgteData = co2eSerie.find((d) => d.aar === valgteAar);
  const forrigeAar = tilgaengeligeAar[tilgaengeligeAar.indexOf(valgteAar) - 1];
  const forrigeData = forrigeAar ? co2eSerie.find((d) => d.aar === forrigeAar) : null;

  const aendring = valgteData && forrigeData
    ? valgteData.vaerdi - forrigeData.vaerdi
    : null;
  const aendringPct = aendring && forrigeData
    ? (aendring / forrigeData.vaerdi) * 100
    : null;

  const paaSporet = aendring !== null && aendring < 0;

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: 16,
        marginBottom: 24,
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 6 }}>
            Klimastatus {valgteAar}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>
            {kommuneNavn} Kommune
          </h1>
          {maalAar && (
            <div style={{ marginTop: 8, fontSize: 15, color: '#6B6B63' }}>
              Klimamål: netto-nul eller tilsvarende reduktion senest <strong style={{ color: '#1A1A18' }}>{maalAar}</strong>
            </div>
          )}
        </div>
        <JaarToggle
          tilgaengeligeAar={tilgaengeligeAar}
          valgteAar={valgteAar}
          onAarValgt={setValgteAar}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 0,
        borderTop: '2px solid #1A1A18',
      }}>
        <div style={{ padding: '20px 24px 20px 0', borderRight: '1px solid #D9D2C2', borderBottom: '1px solid #D9D2C2' }}>
          <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8, lineHeight: 1.3 }}>
            CO₂e {valgteAar ? `(${valgteAar})` : ''}
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
            {valgteData ? (
              <>{valgteData.vaerdi.toFixed(1)} <span style={{ fontSize: 16, fontWeight: 500, color: '#6B6B63' }}>t/capita</span></>
            ) : (
              <span style={{ fontSize: 20, color: '#9A9A8E' }}>Ingen data</span>
            )}
          </div>
        </div>

        {aendring !== null && aendringPct !== null && (
          <div style={{ padding: '20px 24px', borderRight: '1px solid #D9D2C2', borderBottom: '1px solid #D9D2C2' }}>
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8, lineHeight: 1.3 }}>
              Ændring fra {forrigeAar}
            </div>
            <div style={{
              fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em',
              color: paaSporet ? '#1E6B3A' : '#8B2E2E',
            }}>
              {aendring > 0 ? '+' : ''}{aendring.toFixed(1)}
              <span style={{ fontSize: 15, fontWeight: 500, marginLeft: 6 }}>
                ({aendringPct > 0 ? '+' : ''}{aendringPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {maalAar && (
          <div style={{ padding: '20px 0 20px 24px', borderBottom: '1px solid #D9D2C2' }}>
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8, lineHeight: 1.3 }}>
              År til mål
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: '#1E6B3A' }}>
              {maalAar - (valgteAar ?? new Date().getFullYear())}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
