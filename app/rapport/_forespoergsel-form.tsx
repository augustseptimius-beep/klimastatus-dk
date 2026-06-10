'use client';
import { useActionState } from 'react';
import { besvarForespoergselAction } from './actions';
import { Button } from '@/components/ui/button';

type Forespoergsel = {
  id: string;
  tiltagTitel: string;
  spoergsmaal: string | null;
};

export function ForespoergselForm({
  aktiv,
  antal,
  position,
}: {
  aktiv: Forespoergsel;
  antal: number;
  position: number;
}) {
  const action = besvarForespoergselAction.bind(null, aktiv.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        Forespørgsel {position} af {antal}
      </p>
      <h2 className="text-lg font-semibold text-gray-900">{aktiv.tiltagTitel}</h2>
      {aktiv.spoergsmaal && (
        <p className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {aktiv.spoergsmaal}
        </p>
      )}

      <div className="mt-4 grid gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Status for implementering</label>
          <textarea
            name="statusImplementering"
            rows={3}
            placeholder="Beskriv hvor langt I er…"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Barrierer (hvis nogen)</label>
          <textarea
            name="barrierer"
            rows={3}
            placeholder="Hvad står i vejen?"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {state?.message && (
        <p className={`mt-4 rounded-md px-3 py-2 text-sm ${state.message.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {state.message}
        </p>
      )}
      <div className="mt-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Sender…' : 'Send status'}
        </Button>
      </div>
    </form>
  );
}
