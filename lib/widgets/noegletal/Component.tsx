import type { WidgetProps } from '../types';
import type { NoegletalData } from './load';

export function Component({ data }: WidgetProps<NoegletalData>) {
  if (data.length === 0) return null;
  return (
    <section>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 16 }}>
        Nøgletal
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.length, 5)}, 1fr)`, gap: 0, borderTop: '1px solid #1A1A18' }}>
        {data.map((h, i) => (
          <div key={h.kommuneIndikatorId} style={{ padding: '16px 20px 16px 0', borderRight: i < data.length - 1 ? '1px solid #D9D2C2' : undefined, borderBottom: '1px solid #D9D2C2', paddingLeft: i > 0 ? 20 : 0 }}>
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 6, lineHeight: 1.3 }}>{h.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {h.senesteVaerdi !== null ? (
                <>
                  {h.senesteVaerdi.toLocaleString('da-DK', { maximumFractionDigits: 1 })}
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#6B6B63', marginLeft: 4 }}>
                    {h.enhed}{h.senesteAar ? ` (${h.senesteAar})` : ''}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 16, color: '#9A9A8E' }}>Ingen data</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
