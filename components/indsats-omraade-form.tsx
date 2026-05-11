'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import type { FormState } from '@/lib/definitions';

const TYPE_OPTIONS = [
  { value: 'ghg_reduction', label: 'Drivhusgasreduktion' },
  { value: 'adaptation', label: 'Klimatilpasning' },
  { value: 'consumption', label: 'Forbrug' },
  { value: 'just_transition', label: 'Retfærdig omstilling' },
  { value: 'cross_cutting', label: 'Tværgående' },
];
const SEKTOR_OPTIONS = [
  { value: 'energy', label: 'Energi' },
  { value: 'transport', label: 'Transport' },
  { value: 'buildings', label: 'Bygninger' },
  { value: 'food', label: 'Fødevarer' },
  { value: 'agriculture', label: 'Landbrug' },
  { value: 'waste', label: 'Affald' },
  { value: 'adaptation', label: 'Klimatilpasning' },
  { value: 'other', label: 'Andet' },
];

type DefaultValues = { navn?: string; type?: string; sektor?: string; beskrivelse?: string | null; ansvarligForvaltning?: string | null };

export function IndsatsOmraadeForm({
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
        <label htmlFor="type" className="text-sm font-medium text-gray-700">Type</label>
        <select id="type" name="type" required defaultValue={defaultValues?.type ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Vælg type</option>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {state?.errors?.type && <p className="text-sm text-red-600">{state.errors.type[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sektor" className="text-sm font-medium text-gray-700">Sektor</label>
        <select id="sektor" name="sektor" required defaultValue={defaultValues?.sektor ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Vælg sektor</option>
          {SEKTOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {state?.errors?.sektor && <p className="text-sm text-red-600">{state.errors.sektor[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="beskrivelse" className="text-sm font-medium text-gray-700">Beskrivelse</label>
        <textarea id="beskrivelse" name="beskrivelse" rows={3} defaultValue={defaultValues?.beskrivelse ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ansvarligForvaltning" className="text-sm font-medium text-gray-700">Ansvarlig forvaltning</label>
        <input id="ansvarligForvaltning" name="ansvarligForvaltning" type="text" defaultValue={defaultValues?.ansvarligForvaltning ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>

      {state?.message && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Gemmer…' : 'Gem'}</Button>
    </form>
  );
}
