'use client';

export function PrintButton({ label = 'Udskriv / Gem som PDF' }: { label?: string }) {
  return (
    <button className="ks-btn ks-btn-primary" onClick={() => window.print()}>
      {label}
    </button>
  );
}
