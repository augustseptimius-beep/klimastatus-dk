'use client';
import { useState } from 'react';
import { opretLaeringspostAction } from './actions';
import { BESLUTNINGER, beslutningLabel, knytningLabel } from '@/lib/merl/laeringspost-types';
import type { LaeringsKnytning } from '@/lib/merl/laeringspost-types';

export type EntitetValg = { id: string; label: string };

type Props = {
  slug: string;
  tiltagValg: EntitetValg[];
  maalValg: EntitetValg[];
  indsatsomraadeValg: EntitetValg[];
  prefill?: {
    knyttetTilType: LaeringsKnytning;
    knyttetTilId: string;
    observation: string;
    tovholderRapportId: string;
  };
  onDone?: () => void;
};

export function LaeringspostForm({ slug, tiltagValg, maalValg, indsatsomraadeValg, prefill, onDone }: Props) {
  const [type, setType] = useState<LaeringsKnytning>(prefill?.knyttetTilType ?? 'tiltag');
  const valg = type === 'tiltag' ? tiltagValg : type === 'maal' ? maalValg : indsatsomraadeValg;
  const idag = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={async (fd) => { await opretLaeringspostAction(slug, fd); onDone?.(); }}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      {prefill?.tovholderRapportId && (
        <input type="hidden" name="tovholderRapportId" value={prefill.tovholderRapportId} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Knyttet til</span>
          <select
            name="knyttetTilType"
            value={type}
            onChange={(e) => setType(e.target.value as LaeringsKnytning)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {(['tiltag', 'indsatsomraade', 'maal'] as LaeringsKnytning[]).map((k) => (
              <option key={k} value={k}>{knytningLabel(k)}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Vælg {knytningLabel(type).toLowerCase()}</span>
          <select
            name="knyttetTilId"
            defaultValue={prefill?.knyttetTilId ?? ''}
            required
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="" disabled>— vælg —</option>
            {valg.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">Observation</span>
        <textarea
          name="observation"
          defaultValue={prefill?.observation ?? ''}
          required
          rows={2}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          placeholder="Hvad blev observeret?"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">Fortolkning (valgfri)</span>
        <textarea
          name="fortolkning"
          rows={2}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          placeholder="Hvad betyder det for planen?"
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Beslutning</span>
          <select name="beslutning" required defaultValue="" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
            <option value="" disabled>— vælg —</option>
            {BESLUTNINGER.map((b) => <option key={b} value={b}>{beslutningLabel(b)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Beslutningstager</span>
          <input name="beslutningstager" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Dato</span>
          <input type="date" name="dato" defaultValue={idag} required className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      </div>

      <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
        Gem læringspost
      </button>
    </form>
  );
}
