import type { IndsatsomraadeMedCount } from '@/db/queries/public-dashboard';

const SEKTOR_LABELS: Record<string, string> = {
  energy: 'Energi',
  transport: 'Transport',
  buildings: 'Bygninger',
  food: 'Fødevarer',
  agriculture: 'Landbrug',
  waste: 'Affald',
  adaptation: 'Klimatilpasning',
  other: 'Andet',
};

type Props = { indsatser: IndsatsomraadeMedCount[] };

export function IndsatsomraaderSektion({ indsatser }: Props) {
  if (indsatser.length === 0) return null;

  return (
    <section style={{ marginBottom: 40 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#1E6B3A',
          marginBottom: 16,
        }}
      >
        Indsatsområder — {indsatser.length} sektorer
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {indsatser.map((io) => (
          <div
            key={io.id}
            style={{
              background: '#FFFFFF',
              border: '1px solid #D9D2C2',
              borderRadius: 6,
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#1E6B3A',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {SEKTOR_LABELS[io.sektor] ?? io.sektor}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#1A1A18',
                lineHeight: 1.3,
                marginBottom: 8,
              }}
            >
              {io.navn}
            </div>
            <div style={{ fontSize: 13, color: '#6B6B63' }}>
              {io.aktiveTiltagCount} tiltag
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
