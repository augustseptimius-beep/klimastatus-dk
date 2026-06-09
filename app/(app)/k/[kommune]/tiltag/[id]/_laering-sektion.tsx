'use client';
import { useState } from 'react';
import { BESLUTNINGER, beslutningLabel } from '@/lib/merl/laeringspost-types';
import type { LaeringForTiltag } from '@/db/queries/tiltag-detalje';
import type { LaeringsBeslutning } from '@/lib/merl/laeringspost-types';

type Props = {
  poster: LaeringForTiltag[];
  iDag: string;
  action: (formData: FormData) => void;
};

export function LaeringSektion({ poster, iDag, action }: Props) {
  const [viserForm, setViserForm] = useState(false);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">{poster.length} læringsposter</span>
        <button
          type="button"
          onClick={() => setViserForm((v) => !v)}
          className="ks-btn ks-btn-secondary"
          style={{ padding: '5px 10px', fontSize: 12 }}
        >
          {viserForm ? 'Annullér' : '+ Ny læringspost'}
        </button>
      </div>

      {viserForm && (
        <form action={action} className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Observation</label>
            <textarea name="observation" required rows={2} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="Hvad blev observeret?" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Fortolkning (valgfri)</label>
            <textarea name="fortolkning" rows={2} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="Hvad betyder det?" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700">Beslutning</label>
              <select name="beslutning" required className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm">
                {BESLUTNINGER.map((b) => (
                  <option key={b} value={b}>{beslutningLabel(b as LaeringsBeslutning)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700">Beslutningstager (valgfri)</label>
              <input name="beslutningstager" className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
          </div>
          <input type="hidden" name="dato" value={iDag} />
          <button type="submit" className="ks-btn ks-btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
            Gem læringspost
          </button>
        </form>
      )}

      {poster.length === 0 ? (
        <p className="text-sm text-gray-400">Ingen læring registreret på dette tiltag endnu.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {poster.map((lp) => (
            <li key={lp.id} className="py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-900">{lp.observation}</p>
                  {lp.fortolkning && <p className="mt-0.5 text-xs text-gray-500">{lp.fortolkning}</p>}
                  <p className="mt-1 text-xs text-gray-400">{lp.dato}{lp.beslutningstager ? ` · ${lp.beslutningstager}` : ''}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {beslutningLabel(lp.beslutning as LaeringsBeslutning)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
