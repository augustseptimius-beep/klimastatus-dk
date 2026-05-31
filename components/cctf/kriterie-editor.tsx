'use client';
import { useEffect, useRef, useState } from 'react';
import { saveKriterieBesvarelse, godkendKriterie } from '@/app/(app)/selvevaluering/actions';
import type { KriterieBesvarelse, KriterieStatus, DokRef } from '@/lib/cctf/selvevaluering-types';
import type { CctfKriterieRow } from '@/db/queries/cctf';
import type { CctfKriterieResult } from '@/lib/cctf/coverage-engine';

const STATUS_BADGE: Record<KriterieStatus, { label: string; color: string; bg: string }> = {
  tom:       { label: 'Tom',       color: '#9C9C8E', bg: '#f5f5f5' },
  ai_udkast: { label: 'AI-udkast', color: '#3a7abf', bg: '#e8f0fb' },
  redigeret: { label: 'Redigeret', color: '#8B6914', bg: '#fff8e1' },
  godkendt:  { label: 'Godkendt',  color: '#1E6B3A', bg: '#e8f5e9' },
};

type Props = {
  kriterie: CctfKriterieRow;
  besvarelse: KriterieBesvarelse;
  daekning: CctfKriterieResult;
  liveDokRefs: DokRef[];
};

export function KriterieEditor({ kriterie, besvarelse, daekning, liveDokRefs }: Props) {
  const { kriterieNr } = kriterie;
  const [open, setOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState<KriterieStatus>(besvarelse.status);
  const [saving, setSaving] = useState(false);
  const [godkending, setGodkending] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup: clear save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Sync localStatus when besvarelse.status changes
  useEffect(() => {
    setLocalStatus(besvarelse.status);
  }, [besvarelse.status]);

  const [fields, setFields] = useState({
    hvadStaarPaa: besvarelse.hvadStaarPaa,
    hvadOpdateres: besvarelse.hvadOpdateres,
    selvvurdering: besvarelse.selvvurdering,
  });

  const handleChange = (field: keyof typeof fields, value: string) => {
    const updated = { ...fields, [field]: value };
    setFields(updated);
    setLocalStatus('redigeret');

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await saveKriterieBesvarelse(kriterieNr, updated);
      setSaving(false);
    }, 1000);
  };

  const handleGodkend = async () => {
    setGodkending(true);
    const result = await godkendKriterie(kriterieNr);
    if (result.ok) setLocalStatus('godkendt');
    setGodkending(false);
  };

  const badge = STATUS_BADGE[localStatus];
  const visibleDokRefs = localStatus === 'godkendt'
    ? besvarelse.dokumentationshenvisninger
    : liveDokRefs;

  const daekningSuffix = daekning.status === 'komplet' ? '● Komplet' :
    daekning.status === 'delvis' ? '◐ Delvis' :
    daekning.status === 'manglende' ? '○ Manglende' : '○ Afventer';

  return (
    <div style={{ borderBottom: '1px solid var(--sand-200, #EAE4D6)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ minWidth: 24, fontWeight: 700, fontSize: 13, color: 'var(--ink-400)', flexShrink: 0 }}>
          {kriterieNr}
        </span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>
          {kriterie.titel}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-400)', marginRight: 8 }}>
          {daekningSuffix}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 12,
          background: badge.bg, color: badge.color,
          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {badge.label}
          {saving && <span style={{ fontSize: 10, opacity: 0.6 }}>●</span>}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-400)', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ paddingBottom: 20, paddingLeft: 36 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-400)', marginBottom: 16, fontStyle: 'italic' }}>
            {kriterie.beskrivelse}
          </p>

          {(['hvadStaarPaa', 'hvadOpdateres', 'selvvurdering'] as const).map(field => {
            const labels: Record<string, string> = {
              hvadStaarPaa: 'Hvad kommunen allerede har gjort',
              hvadOpdateres: 'Hvad kommunen vil opdatere / udbygge',
              selvvurdering: 'Samlet selvvurdering',
            };
            return (
              <div key={field} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-600)', marginBottom: 4 }}>
                  {labels[field]}
                </label>
                <textarea
                  value={fields[field]}
                  onChange={e => handleChange(field, e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: '1px solid var(--sand-300)',
                    background: 'white',
                    fontSize: 14,
                    lineHeight: 1.6,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    color: 'var(--ink-900)',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Skriv her..."
                />
              </div>
            );
          })}

          {visibleDokRefs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-500)', marginBottom: 6 }}>
                Dokumentation {localStatus !== 'godkendt' ? '(live fra mappings)' : '(snapshot)'}:
              </div>
              {visibleDokRefs.map((ref) => (
                <div key={`${ref.entitetType}:${ref.entitetId}`} style={{ fontSize: 13, color: 'var(--ink-700)', paddingLeft: 12, marginBottom: 2 }}>
                  • {ref.label}
                  {ref.bemaerkning && <span style={{ color: 'var(--ink-400)', marginLeft: 8 }}>— {ref.bemaerkning}</span>}
                </div>
              ))}
            </div>
          )}

          {visibleDokRefs.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--ink-300)', marginBottom: 16, fontStyle: 'italic' }}>
              Ingen dokumentationshenvisninger endnu. Knyt tiltag til dette kriterie fra tiltag-redigering.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleGodkend}
              disabled={godkending}
              style={{
                padding: '7px 16px',
                borderRadius: 4,
                border: 'none',
                background: '#1E6B3A',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: godkending ? 'wait' : 'pointer',
                opacity: godkending ? 0.7 : 1,
              }}
            >
              {godkending ? 'Godkender...' : 'Godkend kriterie'}
            </button>
            <button
              disabled
              title="Kommer i næste version (kræver Claude-integration)"
              style={{
                padding: '7px 16px',
                borderRadius: 4,
                border: '1px solid var(--sand-300)',
                background: 'var(--sand-100, #FAF7F2)',
                color: 'var(--ink-300)',
                fontSize: 13,
                cursor: 'not-allowed',
              }}
            >
              🤖 Generér med AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
