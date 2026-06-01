'use client';

import { useState } from 'react';
import type { CctfKriterieResult } from '@/lib/cctf/coverage-engine';

const STATUS_COLORS = {
  komplet: { bg: '#DDE9DE', color: '#2D5A3D', label: 'Komplet' },
  delvis: { bg: '#F5EEDD', color: '#7A4E2A', label: 'Delvis' },
  manglende: { bg: '#F2E0DC', color: '#8B2E2E', label: 'Manglende' },
  afventer: { bg: '#E8E8E0', color: '#666666', label: 'Afventer' },
};

type Props = { daekning: CctfKriterieResult[] };

export function CctfFold({ daekning }: Props) {
  const [open, setOpen] = useState(false);
  const komplet = daekning.filter((d) => d.status === 'komplet').length;
  const delvis = daekning.filter((d) => d.status === 'delvis').length;
  const manglende = daekning.filter((d) => d.status === 'manglende').length;

  return (
    <section style={{ marginBottom: 40 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #1A1A18',
          paddingTop: 16,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#1E6B3A',
          }}
        >
          CCTF-dækning (kriterie 16) — {komplet}/16 komplet, {delvis} delvis, {manglende} manglende
        </span>
        <span style={{ fontSize: 18, color: '#6B6B63', lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 8,
          }}
        >
          {daekning.map((d) => {
            const s = STATUS_COLORS[d.status];
            return (
              <div
                key={d.kriterieNr}
                style={{
                  background: s.bg,
                  borderRadius: 4,
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A18' }}>
                  Kriterie {d.kriterieNr}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: s.color,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
