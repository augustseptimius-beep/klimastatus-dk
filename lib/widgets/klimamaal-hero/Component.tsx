import type { WidgetProps } from '../types';
import type { HeroData } from './load';

export function Component({ data, config }: WidgetProps<HeroData>) {
  const overskrift = typeof config.overskrift === 'string' ? config.overskrift : 'Klimastatus';
  return (
    <section>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 6 }}>
        {overskrift}{data.nuvaerendeAar ? ` ${data.nuvaerendeAar}` : ''}
      </div>
      <h1 style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 24px', lineHeight: 1.1 }}>
        {data.kommuneNavn} Kommune
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', borderTop: '2px solid #1A1A18' }}>
        <div style={{ padding: '20px 24px 20px 0', borderRight: '1px solid #D9D2C2', borderBottom: '1px solid #D9D2C2' }}>
          <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8 }}>Udledning {data.nuvaerendeAar ?? ''}</div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
            {data.nuvaerendeVaerdi !== null ? (
              <>{data.nuvaerendeVaerdi.toLocaleString('da-DK', { maximumFractionDigits: 0 })} <span style={{ fontSize: 15, fontWeight: 500, color: '#6B6B63' }}>{data.enhed}</span></>
            ) : <span style={{ fontSize: 20, color: '#9A9A8E' }}>Ingen data</span>}
          </div>
        </div>

        {data.reduktionPct !== null && (
          <div style={{ padding: '20px 24px', borderRight: '1px solid #D9D2C2', borderBottom: '1px solid #D9D2C2' }}>
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8 }}>Reduktion siden baseline</div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: data.reduktionPct >= 0 ? '#1E6B3A' : '#8B2E2E' }}>
              {data.reduktionPct >= 0 ? '−' : '+'}{Math.abs(data.reduktionPct).toFixed(1)}%
            </div>
          </div>
        )}

        {data.aarTilMaal !== null && (
          <div style={{ padding: '20px 0 20px 24px', borderBottom: '1px solid #D9D2C2' }}>
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 8 }}>År til mål ({data.maalAar})</div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', color: '#1E6B3A' }}>{data.aarTilMaal}</div>
          </div>
        )}
      </div>

      {data.progressPct !== null && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6B63', marginBottom: 6 }}>
            <span>Fremdrift mod {data.maalAar}-målet</span>
            <span style={{ fontWeight: 600, color: '#1A1A18' }}>{data.progressPct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 10, background: '#E0D8C7', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: `${data.progressPct}%`, height: '100%', background: '#1E6B3A' }} />
          </div>
        </div>
      )}
    </section>
  );
}
