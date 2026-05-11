'use client';
import { useActionState } from 'react';
import { createKommuneAction } from '@/app/(admin)/kommuner/actions';
import { Button } from '@/components/ui/button';

export function CreateKommuneForm() {
  const [state, action, pending] = useActionState(createKommuneAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="navn" className="text-sm font-medium text-gray-700">
          Kommunenavn
        </label>
        <input
          id="navn"
          name="navn"
          type="text"
          placeholder="Thisted"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state?.errors?.navn && (
          <p className="text-sm text-red-600">{state.errors.navn[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="kommunekode" className="text-sm font-medium text-gray-700">
          Kommunekode
        </label>
        <input
          id="kommunekode"
          name="kommunekode"
          type="text"
          placeholder="773"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <p className="text-xs text-gray-400">Find kommunekoden på Danmarks Statistik (3-4 cifre).</p>
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
