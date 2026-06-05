'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { parseSkabelonAction, type SkabelonPreview } from './actions';
import { bulkImportAction } from '../importer/actions';

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planlagt', in_progress: 'Igangværende', completed: 'Gennemført', discontinued: 'Udgået',
};

export function SkabelonImporterClient({ slug }: { slug: string }) {
  const [preview, setPreview] = useState<SkabelonPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  async function vælgFil(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    setPreview(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await parseSkabelonAction(slug, fd);
    setPreview(res);
    setBusy(false);
  }

  function opret() {
    if (!preview || preview.indsatser.length === 0) return;
    startTransition(() => { bulkImportAction(slug, preview.indsatser); });
  }

  const antalHandlinger = preview?.indsatser.reduce((n, io) => n + io.handlinger.length, 0) ?? 0;

  return (
    <>
      <div className="ks-page-header">
        <div>
          <div className="eyebrow">Indsatsområder</div>
          <h1>Importer udfyldt skabelon</h1>
          <p className="sub">Har du dit handlingskatalog i et regneark? Hent skabelonen, udfyld den, og upload den her — uden AI, helt forudsigeligt.</p>
        </div>
        <div className="actions">
          <Link href={`/k/${slug}/indsatser`} className="ks-btn ks-btn-secondary">← Tilbage</Link>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        <div className="ks-card" style={{ marginBottom: 20, background: 'var(--moss-50)', border: '1px solid var(--moss-100)' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6 }}>
            <strong>1.</strong> <a href="/api/skabelon/handlingskatalog" style={{ color: 'var(--forest-900)', fontWeight: 600 }}>Hent CSV-skabelonen</a> &nbsp;·&nbsp;
            <strong>2.</strong> Udfyld én række pr. handling (gentag indsatsområdet på tværs af rækker) &nbsp;·&nbsp;
            <strong>3.</strong> Upload den udfyldte fil herunder.
          </div>
        </div>

        <button className="ks-btn ks-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Læser…' : '↑ Vælg udfyldt skabelon (CSV/XLSX)'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => vælgFil(e.target.files?.[0] ?? null)}
        />
        {fileName && <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--ink-500)' }}>{fileName}</span>}
      </div>

      {preview?.fejl && (
        <div className="ks-empty" style={{ maxWidth: 640, marginTop: 20 }}>
          <h3>Kunne ikke læse filen</h3>
          <p>{preview.fejl}</p>
        </div>
      )}

      {preview && !preview.fejl && (
        <div style={{ maxWidth: 640, marginTop: 24 }}>
          <div style={{ fontSize: 14, color: 'var(--ink-500)', marginBottom: 16 }}>
            Klar til at oprette <strong style={{ color: 'var(--ink-900)' }}>{preview.indsatser.length} indsatsområder</strong> med <strong style={{ color: 'var(--ink-900)' }}>{antalHandlinger} handlinger</strong>.
          </div>

          {preview.advarsler.length > 0 && (
            <div className="ks-card" style={{ marginBottom: 16, background: '#fffbeb', border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 8 }}>
                {preview.advarsler.length} række(r) blev sprunget over:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                {preview.advarsler.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {preview.indsatser.map((io, i) => (
              <div key={i} className="ks-card">
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-900)', marginBottom: io.handlinger.length ? 12 : 0 }}>
                  {io.navn} <span className="ks-badge ks-badge-neutral" style={{ fontSize: 11 }}>{io.sektor}</span>
                </div>
                {io.handlinger.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--sand-200)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {io.handlinger.map((h, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, color: 'var(--ink-900)', flex: 1 }}>{h.titel}</span>
                        <span className="ks-badge ks-badge-neutral" style={{ fontSize: 11 }}>{STATUS_LABEL[h.status]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ks-btn ks-btn-primary" onClick={opret} disabled={preview.indsatser.length === 0 || isPending}>
              {isPending ? 'Opretter…' : `Opret ${preview.indsatser.length} indsatsområder + ${antalHandlinger} handlinger`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
