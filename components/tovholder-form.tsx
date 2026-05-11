'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import type { FormState } from '@/lib/definitions';

type DefaultValues = { navn?: string; email?: string; forvaltning?: string | null };

export function TovholderForm({
  action,
  defaultValues,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: DefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="navn" className="text-sm font-medium text-gray-700">Navn</label>
        <input id="navn" name="navn" type="text" required defaultValue={defaultValues?.navn ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.navn && <p className="text-sm text-red-600">{state.errors.navn[0]}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
        <input id="email" name="email" type="email" required defaultValue={defaultValues?.email ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.email && <p className="text-sm text-red-600">{state.errors.email[0]}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="forvaltning" className="text-sm font-medium text-gray-700">Forvaltning</label>
        <input id="forvaltning" name="forvaltning" type="text" defaultValue={defaultValues?.forvaltning ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>
      {state?.message && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Gemmer…' : 'Gem'}</Button>
    </form>
  );
}
