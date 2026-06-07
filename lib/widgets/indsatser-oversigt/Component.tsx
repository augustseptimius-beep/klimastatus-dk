import type { WidgetProps } from '../types';
import type { IndsatsOversigt } from './load';

const TYPE_LABEL: Record<string, string> = {
  ghg_reduction: 'Drivhusgasreduktion',
  adaptation: 'Klimatilpasning',
  consumption: 'Forbrug',
  just_transition: 'Retfærdig omstilling',
  cross_cutting: 'Tværgående',
};

export function Component({ data }: WidgetProps<IndsatsOversigt>) {
  if (data.length === 0) return null;
  return (
    <section>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 16 }}>
        Klimaindsatser
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.map((io) => (
          <div key={io.id} style={{ borderBottom: '1px solid #D9D2C2', paddingBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#1A1A18' }}>{io.navn}</span>
              <span style={{ fontSize: 11, color: '#6B6B63', whiteSpace: 'nowrap' }}>
                {TYPE_LABEL[io.type] ?? io.type}
              </span>
            </div>
            {io.antalTiltag > 0 && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#6B6B63' }}>
                {io.antalTiltag} {io.antalTiltag === 1 ? 'handling' : 'handlinger'}
                {io.antalIgang > 0 && ` · ${io.antalIgang} igangværende`}
                {io.antalFaerdig > 0 && ` · ${io.antalFaerdig} gennemført`}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
