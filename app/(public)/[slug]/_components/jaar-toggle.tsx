'use client';

type Props = {
  tilgaengeligeAar: number[];
  valgteAar: number;
  onAarValgt: (aar: number) => void;
};

export function JaarToggle({ tilgaengeligeAar, valgteAar, onAarValgt }: Props) {
  if (tilgaengeligeAar.length <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {tilgaengeligeAar.map((aar) => (
        <button
          key={aar}
          onClick={() => onAarValgt(aar)}
          style={{
            padding: '4px 10px',
            fontSize: 13,
            fontWeight: valgteAar === aar ? 700 : 500,
            borderRadius: 4,
            border: '1px solid',
            borderColor: valgteAar === aar ? '#1E6B3A' : '#D9D2C2',
            background: valgteAar === aar ? '#1E6B3A' : 'transparent',
            color: valgteAar === aar ? '#FFFFFF' : '#3D3D38',
            cursor: 'pointer',
          }}
        >
          {aar}
        </button>
      ))}
    </div>
  );
}
