'use client';
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '8px 20px', borderRadius: 4,
        background: '#1E6B3A', color: 'white',
        border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}
    >
      Udskriv / Gem som PDF
    </button>
  );
}
