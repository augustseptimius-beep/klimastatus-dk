'use client';
import { useState, useTransition } from 'react';
import { tilknytIndikatorTiltagAction, fjernIndikatorTiltagAction } from './actions';

type Tiltag = { id: string; titel: string };
type Props = {
  slug: string;
  kommuneIndikatorId: string;
  tilknyttedeTiltag: Tiltag[];
  alleTiltag: Tiltag[];
};

export function KoblingPanel({ slug, kommuneIndikatorId, tilknyttedeTiltag, alleTiltag }: Props) {
  const [valgt, setValgt] = useState('');
  const [isPending, startTransition] = useTransition();

  const tilgaengelige = alleTiltag.filter((t) => !tilknyttedeTiltag.some((tt) => tt.id === t.id));

  function tilknyt() {
    if (!valgt) return;
    startTransition(() => tilknytIndikatorTiltagAction(slug, kommuneIndikatorId, valgt));
    setValgt('');
  }

  function fjern(tiltagId: string) {
    startTransition(() => fjernIndikatorTiltagAction(slug, kommuneIndikatorId, tiltagId));
  }

  return (
    <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs">
      <div className="mb-2 font-semibold text-blue-800">Koblinger</div>

      {tilknyttedeTiltag.length > 0 ? (
        <ul className="mb-2 space-y-1">
          {tilknyttedeTiltag.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2">
              <span className="text-blue-900">↔ {t.titel}</span>
              <button
                type="button"
                onClick={() => fjern(t.id)}
                disabled={isPending}
                className="text-blue-400 hover:text-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-blue-600">Ingen koblinger endnu.</p>
      )}

      {tilgaengelige.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={valgt}
            onChange={(e) => setValgt(e.target.value)}
            className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs"
          >
            <option value="">Tilknyt til tiltag…</option>
            {tilgaengelige.map((t) => (
              <option key={t.id} value={t.id}>{t.titel}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={tilknyt}
            disabled={!valgt || isPending}
            className="rounded bg-blue-700 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            Tilknyt
          </button>
        </div>
      )}
    </div>
  );
}
