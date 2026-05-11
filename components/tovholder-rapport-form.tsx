'use client';
import { useActionState } from 'react';
import { saveRapportAction } from '@/app/rapport/actions';
import { Button } from '@/components/ui/button';

type TiltagRow = {
  id: string;
  titel: string;
  status: string;
  type: string;
  beskrivelse?: string | null;
};

type RapportRow = {
  tiltagId: string;
  statusImplementering?: string | null;
  barrierer?: string | null;
  naesteSkrid?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planlagt', in_progress: 'Igangværende',
  completed: 'Gennemført', discontinued: 'Udgået',
};

export function TovholderRapportForm({
  tiltag,
  rapporter,
}: {
  tiltag: TiltagRow[];
  rapporter: RapportRow[];
}) {
  const [state, formAction, pending] = useActionState(saveRapportAction, undefined);
  const getRapport = (id: string) => rapporter.find((r) => r.tiltagId === id);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {tiltag.length === 0 && (
        <p className="text-gray-500">Du har ingen tiltag tilknyttet endnu.</p>
      )}

      {tiltag.map((t) => {
        const rapport = getRapport(t.id);
        return (
          <div key={t.id} className="rounded-xl border border-gray-200 p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t.titel}</h2>
                <p className="text-xs text-gray-400">{STATUS_LABELS[t.status] ?? t.status}</p>
              </div>
            </div>
            <input type="hidden" name={`tiltag_${t.id}_id`} value={t.id} />

            <div className="grid gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Status for implementering</label>
                <textarea
                  name={`tiltag_${t.id}_statusImplementering`}
                  rows={2}
                  defaultValue={rapport?.statusImplementering ?? ''}
                  placeholder="Beskriv nuværende status…"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Barrierer</label>
                <textarea
                  name={`tiltag_${t.id}_barrierer`}
                  rows={2}
                  defaultValue={rapport?.barrierer ?? ''}
                  placeholder="Hvilke barrierer er der?"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Næste skridt</label>
                <textarea
                  name={`tiltag_${t.id}_naesteSkrid`}
                  rows={2}
                  defaultValue={rapport?.naesteSkrid ?? ''}
                  placeholder="Hvad er næste skridt?"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
          </div>
        );
      })}

      {tiltag.length > 0 && (
        <div>
          {state?.message && (
            <p className={`mb-4 rounded-md px-3 py-2 text-sm ${state.message.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Gemmer…' : 'Gem status'}
          </Button>
        </div>
      )}
    </form>
  );
}
