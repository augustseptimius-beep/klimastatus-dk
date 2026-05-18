'use client';

import { useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import { bulkImportAction } from './actions';

type Handling = {
  titel: string;
  type: 'reduction' | 'adaptation' | 'both';
  status: 'planned' | 'in_progress' | 'completed' | 'discontinued';
  beskrivelse?: string;
  inkluder: boolean;
};
type Indsats = {
  navn: string;
  type: 'ghg_reduction' | 'adaptation' | 'consumption' | 'just_transition' | 'cross_cutting';
  sektor: 'energy' | 'transport' | 'buildings' | 'food' | 'agriculture' | 'waste' | 'adaptation' | 'other';
  beskrivelse?: string;
  handlinger: Handling[];
  inkluder: boolean;
};

type Step = 'upload' | 'analysing' | 'review' | 'importing' | 'error';

const TYPE_LABEL: Record<string, string> = {
  ghg_reduction: 'Drivhusgasreduktion', adaptation: 'Klimatilpasning',
  consumption: 'Forbrug', just_transition: 'Retfærdig omstilling', cross_cutting: 'Tværgående',
};
const HANDLING_TYPE_LABEL: Record<string, string> = {
  reduction: 'Reduktion', adaptation: 'Tilpasning', both: 'Begge',
};
const STATUS_LABEL: Record<string, string> = {
  planned: 'Planlagt', in_progress: 'Igangværende', completed: 'Gennemført', discontinued: 'Udgået',
};

export function ImporterClient() {
  const [step, setStep] = useState<Step>('upload');
  const [errorMsg, setErrorMsg] = useState('');
  const [indsatser, setIndsatser] = useState<Indsats[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  async function analyse(file: File) {
    setFileName(file.name);
    setStep('analysing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/importer', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Ukendt fejl');
      const raw: Indsats[] = (data.indsatsomraader ?? []).map((io: Omit<Indsats, 'inkluder' | 'handlinger'> & { handlinger: Omit<Handling, 'inkluder'>[] }) => ({
        ...io,
        inkluder: true,
        handlinger: (io.handlinger ?? []).map((h) => ({ ...h, inkluder: true })),
      }));
      setIndsatser(raw);
      setStep('review');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep('error');
    }
  }

  function handleFile(file: File | null) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'csv', 'xlsx', 'xls', 'docx'].includes(ext)) {
      setErrorMsg(`Filtypen .${ext} understøttes ikke.`);
      setStep('error');
      return;
    }
    analyse(file);
  }

  function toggleIndsats(i: number) {
    setIndsatser((prev) => prev.map((io, idx) => idx === i ? { ...io, inkluder: !io.inkluder } : io));
  }

  function toggleHandling(i: number, j: number) {
    setIndsatser((prev) => prev.map((io, idx) =>
      idx === i ? { ...io, handlinger: io.handlinger.map((h, hidx) => hidx === j ? { ...h, inkluder: !h.inkluder } : h) } : io,
    ));
  }

  function doImport() {
    const payload = indsatser
      .filter((io) => io.inkluder)
      .map((io) => ({
        navn: io.navn, type: io.type, sektor: io.sektor, beskrivelse: io.beskrivelse,
        handlinger: io.handlinger.filter((h) => h.inkluder).map((h) => ({
          titel: h.titel, type: h.type, status: h.status, beskrivelse: h.beskrivelse,
        })),
      }));
    setStep('importing');
    startTransition(() => { bulkImportAction(payload); });
  }

  const totalHandlinger = indsatser.filter((io) => io.inkluder).reduce((n, io) => n + io.handlinger.filter((h) => h.inkluder).length, 0);
  const totalIndsatser = indsatser.filter((io) => io.inkluder).length;

  return (
    <>
      <div className="ks-page-header">
        <div>
          <div className="eyebrow">Indsatsområder</div>
          <h1>Importer handlingskatalog</h1>
          <p className="sub">Upload dit eksisterende handlingskatalog — Claude analyserer det og foreslår indsatsområder og handlinger.</p>
        </div>
        <div className="actions">
          <Link href="/indsatser" className="ks-btn ks-btn-secondary">← Tilbage</Link>
        </div>
      </div>

      {step === 'upload' && (
        <div style={{ maxWidth: 560 }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] ?? null); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--forest-900)' : 'var(--sand-400)'}`,
              borderRadius: 8,
              padding: '48px 32px',
              textAlign: 'center',
              background: dragOver ? 'var(--moss-50)' : 'white',
              cursor: 'pointer',
              transition: 'border-color 120ms ease, background 120ms ease',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink-900)', marginBottom: 8 }}>
              Træk fil hertil eller klik for at vælge
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
              Understøttede formater: PDF, DOCX, XLSX, XLS, CSV
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="ks-card" style={{ marginTop: 24, background: 'var(--moss-50)', border: '1px solid var(--moss-100)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest-900)', marginBottom: 8 }}>Hvad sker der med din fil?</div>
            <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6 }}>
              Filen sendes til Claude (Anthropic) til analyse. Ingen data gemmes hos Anthropic.
              Du får vist et forslag til indsatsområder og handlinger, som du kan gennemse og redigere, inden noget oprettes.
            </div>
          </div>
        </div>
      )}

      {step === 'analysing' && (
        <div style={{ maxWidth: 480, textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink-900)', marginBottom: 8 }}>
            Claude analyserer <em style={{ fontStyle: 'normal', color: 'var(--forest-900)' }}>{fileName}</em>
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-500)' }}>Det tager typisk 15–30 sekunder…</div>
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%', background: 'var(--forest-900)',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
        </div>
      )}

      {step === 'error' && (
        <div className="ks-empty" style={{ maxWidth: 560 }}>
          <h3>Noget gik galt</h3>
          <p>{errorMsg}</p>
          <button className="ks-btn ks-btn-secondary" onClick={() => setStep('upload')}>Prøv igen</button>
        </div>
      )}

      {step === 'review' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: 'var(--ink-500)' }}>
              Claude fandt <strong style={{ color: 'var(--ink-900)' }}>{indsatser.length} indsatsområder</strong> med <strong style={{ color: 'var(--ink-900)' }}>{indsatser.reduce((n, io) => n + io.handlinger.length, 0)} handlinger</strong> i <em style={{ fontStyle: 'normal', color: 'var(--ink-500)' }}>{fileName}</em>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="ks-btn ks-btn-secondary" onClick={() => setStep('upload')}>Upload anden fil</button>
              <button
                className="ks-btn ks-btn-primary"
                onClick={doImport}
                disabled={totalIndsatser === 0}
              >
                Opret {totalIndsatser} indsatsområder + {totalHandlinger} handlinger
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {indsatser.map((io, i) => (
              <div key={i} className="ks-card" style={{ opacity: io.inkluder ? 1 : 0.45, transition: 'opacity 120ms ease' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: io.handlinger.length ? 16 : 0 }}>
                  <input
                    type="checkbox"
                    checked={io.inkluder}
                    onChange={() => toggleIndsats(i)}
                    style={{ marginTop: 3, accentColor: 'var(--forest-900)', width: 15, height: 15, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-900)' }}>{io.navn}</span>
                      <span className="ks-badge ks-badge-success">{TYPE_LABEL[io.type]}</span>
                      <span className="ks-badge ks-badge-neutral">{io.sektor}</span>
                    </div>
                    {io.beskrivelse && (
                      <p style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 4, lineHeight: 1.5 }}>{io.beskrivelse}</p>
                    )}
                  </div>
                </div>

                {io.handlinger.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--sand-200)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {io.handlinger.map((h, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: h.inkluder ? 1 : 0.45 }}>
                        <input
                          type="checkbox"
                          checked={h.inkluder}
                          onChange={() => toggleHandling(i, j)}
                          style={{ accentColor: 'var(--forest-900)', width: 13, height: 13, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 14, color: 'var(--ink-900)', flex: 1 }}>{h.titel}</span>
                        <span className="ks-badge ks-badge-info" style={{ fontSize: 11 }}>{HANDLING_TYPE_LABEL[h.type]}</span>
                        <span className="ks-badge ks-badge-neutral" style={{ fontSize: 11 }}>{STATUS_LABEL[h.status]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="ks-btn ks-btn-primary"
              onClick={doImport}
              disabled={totalIndsatser === 0 || isPending}
            >
              {isPending ? 'Opretter…' : `Opret ${totalIndsatser} indsatsområder + ${totalHandlinger} handlinger`}
            </button>
          </div>
        </>
      )}

      {step === 'importing' && (
        <div style={{ maxWidth: 480, textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink-900)' }}>Opretter indsatsområder og handlinger…</div>
        </div>
      )}
    </>
  );
}
