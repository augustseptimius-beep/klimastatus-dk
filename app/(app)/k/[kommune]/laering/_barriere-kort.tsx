'use client';
import { useState } from 'react';
import { LaeringspostForm, type EntitetValg } from './_laeringspost-form';
import type { BarriereRapport } from '@/db/queries/laeringspost';

type Props = {
  slug: string;
  barriere: BarriereRapport;
  tiltagValg: EntitetValg[];
  maalValg: EntitetValg[];
  indsatsomraadeValg: EntitetValg[];
};

export function BarriereKort({ slug, barriere, tiltagValg, maalValg, indsatsomraadeValg }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{barriere.tiltagTitel}</p>
          <p className="mt-0.5 text-sm text-gray-600">{barriere.barrierer}</p>
          <p className="mt-1 text-xs text-gray-400">Rapporteret {barriere.dato}</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {open ? 'Annullér' : 'Omsæt til læringspost'}
        </button>
      </div>
      {open && (
        <div className="mt-3">
          <LaeringspostForm
            slug={slug}
            tiltagValg={tiltagValg}
            maalValg={maalValg}
            indsatsomraadeValg={indsatsomraadeValg}
            prefill={{
              knyttetTilType: 'tiltag',
              knyttetTilId: barriere.tiltagId,
              observation: barriere.barrierer,
              tovholderRapportId: barriere.rapportId,
            }}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
