'use client';
import { useActionState } from 'react';
import { createKommuneAction } from '@/app/admin/kommuner/actions';
import { Button } from '@/components/ui/button';
import { ALLE_KOMMUNER } from '@/lib/kommuner-liste';

export function CreateKommuneForm() {
  const [state, action, pending] = useActionState(createKommuneAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="kommunekode" className="text-sm font-medium text-gray-700">
          Kommune
        </label>
        <select
          id="kommunekode"
          name="kommunekode"
          defaultValue=""
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="" disabled>Vælg kommune…</option>
          {ALLE_KOMMUNER.map(k => (
            <option key={k.kode} value={k.kode}>
              {k.navn} ({k.kode})
            </option>
          ))}
        </select>
        {state?.errors?.kommunekode && (
          <p className="text-sm text-red-600">{state.errors.kommunekode[0]}</p>
        )}
      </div>

      {state?.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Opretter…' : 'Opret kommune'}
      </Button>
    </form>
  );
}
