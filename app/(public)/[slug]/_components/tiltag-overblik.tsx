import type { TiltagStatusOversigt, StagnertTiltag } from '@/db/queries/public-dashboard';

const LABELS: Record<string, string> = {
  planned:    'Planlagte',
  in_progress: 'Igangsat',
  completed:  'Gennemførte',
  stagneret:  'Kræver opmærksomhed',
};

const COLORS: Record<string, string> = {
  planned:    '#D9D2C2',
  in_progress: '#1E6B3A',
  completed:  '#2A8048',
  stagneret:  '#8B2E2E',
};

type Props = {
  oversigt: TiltagStatusOversigt;
  stagnerede: StagnertTiltag[];
};

export function TiltagOverblik({ oversigt, stagnerede }: Props) {
  const total = oversigt.planned + oversigt.in_progress + oversigt.completed + oversigt.stagneret;
  if (total === 0) return null;

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 16,
      }}>
        Klimatiltag — {total} i alt
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        borderTop: '1px solid #1A1A18',
        marginBottom: 24,
      }}>
        {(['planned', 'in_progress', 'completed', 'stagneret'] as const).map((key, i) => (
          <div
            key={key}
            style={{
              padding: '16px 20px 16px 0',
              borderRight: i < 3 ? '1px solid #D9D2C2' : undefined,
              borderBottom: '1px solid #D9D2C2',
              paddingLeft: i > 0 ? 20 : 0,
            }}
          >
            <div style={{ fontSize: 12, color: '#6B6B63', marginBottom: 6 }}>{LABELS[key]}</div>
            <div style={{
              fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em',
              color: oversigt[key] > 0 ? COLORS[key] : '#D9D2C2',
            }}>
              {oversigt[key]}
            </div>
          </div>
        ))}
      </div>

      {stagnerede.length > 0 && (
        <div style={{
          background: '#FDF5F5', border: '1px solid #F2E0DC',
          borderRadius: 6, padding: '16px 20px',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: '#8B2E2E',
            marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {stagnerede.length} tiltag kræver opmærksomhed
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {stagnerede.map((t) => (
              <li key={t.id} style={{ fontSize: 14, color: '#3D3D38', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B2E2E', flexShrink: 0 }} />
                {t.titel}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
