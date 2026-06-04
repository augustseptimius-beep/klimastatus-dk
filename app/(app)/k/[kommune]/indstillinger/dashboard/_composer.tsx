'use client';

import { useState, useTransition, useRef } from 'react';
import { updateDashboardWidgets } from './actions';
import type { WidgetDefinition, WidgetInstans, ConfigFelt } from '@/lib/widgets/types';

type Option = { value: string; label: string };

type Props = {
  slug: string;
  subdomain: string;
  initielle: WidgetInstans[];
  definitioner: WidgetDefinition[];
  indikatorer: Option[];
};

export function Composer({ slug, subdomain, initielle, definitioner, indikatorer }: Props) {
  const [widgets, setWidgets] = useState<WidgetInstans[]>(initielle);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();
  const [previewKey, setPreviewKey] = useState(0);
  const dragIndex = useRef<number | null>(null);
  const defMap = Object.fromEntries(definitioner.map((d) => [d.type, d]));

  function opdater(i: number, patch: Partial<WidgetInstans>) {
    setWidgets((ws) => ws.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }
  function fjern(i: number) {
    setWidgets((ws) => ws.filter((_, idx) => idx !== i));
  }
  function tilfoej(def: WidgetDefinition) {
    const config: Record<string, unknown> = {};
    for (const f of def.configFelter) config[f.key] = f.standard;
    setWidgets((ws) => [
      ...ws,
      { id: crypto.randomUUID(), type: def.type, width: def.standardBredde, enabled: true, config },
    ]);
  }
  function flyt(fra: number, til: number) {
    setWidgets((ws) => {
      const kopi = [...ws];
      const [item] = kopi.splice(fra, 1);
      kopi.splice(til, 0, item);
      return kopi;
    });
  }

  function gem() {
    startTransition(async () => {
      const res = await updateDashboardWidgets(slug, widgets);
      setStatus(res.ok ? 'saved' : 'error');
      if (res.ok) {
        setPreviewKey((k) => k + 1);
        setTimeout(() => setStatus('idle'), 2000);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Venstre: byg */}
      <div className="flex flex-col gap-3">
        {widgets.map((w, i) => {
          const def = defMap[w.type];
          if (!def) return null;
          return (
            <div
              key={w.id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current !== null && dragIndex.current !== i) flyt(dragIndex.current, i);
                dragIndex.current = null;
              }}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="cursor-grab text-gray-400" title="Træk for at flytte">⠿</span>
                  <span className="font-semibold text-gray-900">{def.navn}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" checked={w.enabled} onChange={(e) => opdater(i, { enabled: e.target.checked })} />
                    Vis
                  </label>
                  <button onClick={() => fjern(i)} className="text-sm text-red-700 hover:underline">Fjern</button>
                </div>
              </div>

              <p className="mt-1 text-xs text-gray-500">{def.beskrivelse}</p>

              {/* Bredde */}
              {def.tilladteBredder.length > 1 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Bredde:</span>
                  {def.tilladteBredder.map((b) => (
                    <button
                      key={b}
                      onClick={() => opdater(i, { width: b })}
                      className={`rounded border px-2 py-0.5 text-xs ${w.width === b ? 'border-green-700 bg-green-50 text-green-800' : 'border-gray-300 text-gray-600'}`}
                    >
                      {b === 4 ? 'Fuld' : b === 3 ? '¾' : b === 2 ? '½' : '¼'}
                    </button>
                  ))}
                </div>
              )}

              {/* Config-felter */}
              {def.configFelter.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {def.configFelter.map((felt) => (
                    <ConfigInput
                      key={felt.key}
                      felt={felt}
                      value={w.config[felt.key]}
                      indikatorer={indikatorer}
                      onChange={(v) => opdater(i, { config: { ...w.config, [felt.key]: v } })}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Tilføj widget */}
        <details className="rounded-lg border border-dashed border-gray-300 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-green-700">+ Tilføj widget</summary>
          <div className="mt-3 flex flex-col gap-2">
            {definitioner.map((def) => (
              <button
                key={def.type}
                onClick={() => tilfoej(def)}
                className="rounded border border-gray-200 p-2 text-left hover:bg-gray-50"
              >
                <div className="text-sm font-medium text-gray-900">{def.navn}</div>
                <div className="text-xs text-gray-500">{def.beskrivelse}</div>
              </button>
            ))}
          </div>
        </details>

        <div className="flex items-center gap-3">
          <button
            onClick={gem}
            disabled={isPending}
            className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? 'Gemmer…' : 'Gem dashboard'}
          </button>
          {status === 'saved' && <span className="text-sm text-green-700">Gemt ✓ — preview opdateret</span>}
          {status === 'error' && <span className="text-sm text-red-700">Fejl — prøv igen</span>}
        </div>
      </div>

      {/* Højre: live preview */}
      <div className="lg:sticky lg:top-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Live preview</div>
        <div className="overflow-hidden rounded-lg border border-gray-200" style={{ height: 700 }}>
          <iframe key={previewKey} src={`/${subdomain}`} title="Preview" style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
        <p className="mt-2 text-xs text-gray-400">Previewet viser den senest gemte version.</p>
      </div>
    </div>
  );
}

function ConfigInput({
  felt,
  value,
  indikatorer,
  onChange,
}: {
  felt: ConfigFelt;
  value: unknown;
  indikatorer: Option[];
  onChange: (v: unknown) => void;
}) {
  if (felt.type === 'text') {
    return (
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {felt.label}
        {felt.multiline ? (
          <textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
          />
        ) : (
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
          />
        )}
      </label>
    );
  }
  if (felt.type === 'select') {
    return (
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {felt.label}
        <select
          value={typeof value === 'string' ? value : felt.standard}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
        >
          {felt.valg.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
    );
  }
  if (felt.type === 'number') {
    return (
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {felt.label}
        <input
          type="number"
          value={typeof value === 'number' ? value : felt.standard}
          min={felt.min}
          max={felt.max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
        />
      </label>
    );
  }
  // multiselect (kun kilde 'kommuneIndikatorer' i Fase 1)
  const valgte = Array.isArray(value) ? (value as string[]) : [];
  const maxN = felt.maxValg ?? Infinity;
  return (
    <div className="flex flex-col gap-1 text-xs text-gray-600">
      <span>{felt.label} ({valgte.length}{felt.maxValg ? `/${felt.maxValg}` : ''})</span>
      <div className="flex flex-col gap-1">
        {indikatorer.length === 0 && <span className="text-gray-400">Ingen aktive indikatorer endnu.</span>}
        {indikatorer.map((o) => {
          const checked = valgte.includes(o.value);
          return (
            <label key={o.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && valgte.length >= maxN}
                onChange={() =>
                  onChange(checked ? valgte.filter((v) => v !== o.value) : [...valgte, o.value])
                }
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
