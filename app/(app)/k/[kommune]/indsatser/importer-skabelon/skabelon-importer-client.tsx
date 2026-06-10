'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { parseSkabelonAction, type SkabelonPreview } from './actions';
import { bulkImportAction, importDiffAction } from '../importer/actions';
import type { ImportDiff } from '@/lib/import/merge-katalog';

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planlagt', in_progress: 'Igangværende', completed: 'Gennemført', discontinued: 'Udgået',
};

export function SkabelonImporterClient({ slug }: { slug: string }) {
  const [preview, setPreview] = useState<SkabelonPreview | null>(null);
  const [diff, setDiff] = useState<ImportDiff | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  async function vælgFil(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    setPreview(null);
    setDiff(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await parseSkabelonAction(slug, fd);
    if (!res.fejl && res.indsatser.length > 0) {
      try {
        setDiff(await importDiffAction(slug, res.indsatser));
      } catch {
        setDiff(null); // diff er kun vejledende — serveren fletter uanset
      }
    }
    setPreview(res);
    setBusy(false);
  }

  function opret() {
    if (!preview || preview.indsatser.length === 0) return;
    startTransition(() => { bulkImportAction(slug, preview.indsatser); });
  }

  const antalHandlinger = preview?.indsatser.reduce((n, io) => n + io.handlinger.length, 0) ?? 0;
  const fletIndsatser = diff?.indsatser.filter((d) => d.findes).length ?? 0;
  const dubletHandlinger = diff?.indsatser.reduce((n, d) => n + d.handlingerFindes.filter(Boolean).length, 0) ?? 0;
  const antalIndsatser = preview?.indsatser.length ?? 0;
  const opretLabel = fletIndsatser > 0 || dubletHandlinger > 0
    ? `Opret ${antalIndsatser - fletIndsatser} nye + flet ${fletIndsatser} eksisterende (${antalHandlinger - dubletHandlinger} handlinger)`
    : `Opret ${antalIndsatser} indsatsområder + ${antalHandlinger} handlinger`;

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
            <strong>1.</strong> <Link href="/api/skabelon/handlingskatalog" style={{ color: 'var(--forest-900)', fontWeight: 600 }}>Hent CSV-skabelonen</Link> &nbsp;·&nbsp;
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

          {(fletIndsatser > 0 || dubletHandlinger > 0) && (
            <div className="ks-card" style={{ marginBottom: 16, background: '#fffbeb', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                <strong>Dele af kataloget findes allerede.</strong>{' '}
                {fletIndsatser > 0 && <>{fletIndsatser} indsatsområde{fletIndsatser === 1 ? '' : 'r'} genbruges — nye handlinger lægges ind i {fletIndsatser === 1 ? 'det' : 'dem'}. </>}
                {dubletHandlinger > 0 && <>{dubletHandlinger} handling{dubletHandlinger === 1 ? '' : 'er'} springes over, fordi de allerede er oprettet. </>}
                Der oprettes ingen dubletter.
              </div>
            </div>
          )}

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
                  {diff?.indsatser[i]?.findes && <span className="ks-badge ks-badge-warn" style={{ fontSize: 11, marginLeft: 6 }}>Findes — flettes</span>}
                </div>
                {io.handlinger.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--sand-200)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {io.handlinger.map((h, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, color: 'var(--ink-900)', flex: 1 }}>{h.titel}</span>
                        {diff?.indsatser[i]?.handlingerFindes[j] && (
                          <span className="ks-badge ks-badge-warn" style={{ fontSize: 11 }}>Findes — springes over</span>
                        )}
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
              {isPending ? 'Opretter…' : opretLabel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
