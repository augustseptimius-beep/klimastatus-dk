import type { WidgetProps } from '../types';

export function Component({ config }: WidgetProps<null>) {
  const overskrift = typeof config.overskrift === 'string' ? config.overskrift : '';
  const tekst = typeof config.tekst === 'string' ? config.tekst : '';
  return (
    <section style={{ borderTop: '1px solid #1A1A18', paddingTop: 16 }}>
      {overskrift && (
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          {overskrift}
        </h2>
      )}
      {tekst && (
        <p style={{ fontSize: 15, lineHeight: 1.6, color: '#3D3D38', margin: 0, whiteSpace: 'pre-wrap' }}>
          {tekst}
        </p>
      )}
    </section>
  );
}
