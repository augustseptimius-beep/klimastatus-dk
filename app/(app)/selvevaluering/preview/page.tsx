import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { getSelvevaluering } from '@/db/queries/selvevaluering';
import { getCctfKriterier } from '@/db/queries/cctf';
import { PrintButton } from './_print-button';
import Link from 'next/link';
import React from 'react';

export const metadata = { title: 'Selvevaluering — Eksport' };

export default async function SelvevalueringPreviewPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [kriterier, saved] = await Promise.all([
    getCctfKriterier(),
    getSelvevaluering(session.kommuneId),
  ]);

  if (!saved) redirect('/selvevaluering');

  const data = saved.kriterieData;
  const besvarelseByNr = new Map(data.kriterier.map(k => [k.kriterieNr, k]));

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11pt; }
          .cctf-skema td, .cctf-skema th { padding: 8px 10px; font-size: 10pt; }
        }
        .cctf-skema { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .cctf-skema th, .cctf-skema td {
          border: 1px solid #ccc;
          padding: 10px 12px;
          vertical-align: top;
          font-size: 13px;
          line-height: 1.5;
        }
        .cctf-skema th { background: #f5f0e8; font-weight: 700; font-size: 12px; }
        .cctf-skema tr:nth-child(even) { background: #fafaf8; }
        .cctf-komponent-header td {
          background: #1E6B3A !important;
          color: white;
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 12px;
        }
      `}</style>

      <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
        <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
          <Link href="/selvevaluering" style={{ fontSize: 13, color: 'var(--ink-500)' }}>← Tilbage</Link>
          <PrintButton />
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Selvevalueringsskema — CCTF v{data.cctfVersion}
        </h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>
          Genereret: {saved.genereretDato.toLocaleDateString('da-DK')}
        </p>

        <table className="cctf-skema">
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '48%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Beskrivelse af kriterie</th>
              <th>Besvarelse</th>
              <th>Dokumentationshenvisninger</th>
            </tr>
          </thead>
          <tbody>
            {kriterier.map((k, idx) => {
              const prev = idx > 0 ? kriterier[idx - 1] : null;
              const showKomponent = !prev || prev.komponent !== k.komponent;
              const b = besvarelseByNr.get(k.kriterieNr);

              return (
                <React.Fragment key={k.id}>
                  {showKomponent && (
                    <tr className="cctf-komponent-header">
                      <td colSpan={4}>{k.komponent}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ fontWeight: 700, textAlign: 'center' }}>{k.kriterieNr}</td>
                    <td>
                      <strong>{k.titel}</strong>
                      <br /><br />
                      <span style={{ color: '#555', fontSize: 12 }}>{k.beskrivelse}</span>
                    </td>
                    <td>
                      {b?.hvadStaarPaa && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                            Hvad kommunen allerede har gjort:
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{b.hvadStaarPaa}</div>
                        </div>
                      )}
                      {b?.hvadOpdateres && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                            Hvad kommunen vil opdatere/udbygge:
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{b.hvadOpdateres}</div>
                        </div>
                      )}
                      {b?.selvvurdering && (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>
                            Selvvurdering:
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{b.selvvurdering}</div>
                        </div>
                      )}
                      {!b?.hvadStaarPaa && !b?.hvadOpdateres && !b?.selvvurdering && (
                        <span style={{ color: '#aaa', fontStyle: 'italic' }}>Ikke udfyldt</span>
                      )}
                    </td>
                    <td>
                      {b?.dokumentationshenvisninger?.map((ref) => (
                        <div key={`${ref.entitetType}:${ref.entitetId}`} style={{ marginBottom: 4, fontSize: 12 }}>
                          • {ref.label}
                          {ref.bemaerkning && <div style={{ color: '#888', paddingLeft: 8 }}>{ref.bemaerkning}</div>}
                        </div>
                      ))}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
