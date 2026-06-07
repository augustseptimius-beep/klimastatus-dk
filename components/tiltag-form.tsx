'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import type { FormState } from '@/lib/definitions';

type IndsatsOption = { id: string; navn: string };
type DefaultValues = {
  titel?: string; indsatsOmraadeId?: string; type?: string;
  status?: string; beskrivelse?: string | null;
  tidsrammeStart?: string | null; tidsrammeSlut?: string | null;
  forventetEffektCo2Ton?: number | null;
};

const YEARS = Array.from({ length: 36 }, (_, i) => 2015 + i); // 2015–2050
const MONTHS = [
  { value: '02', label: 'Februar' }, { value: '03', label: 'Marts' },
  { value: '04', label: 'April' },   { value: '05', label: 'Maj' },
  { value: '06', label: 'Juni' },    { value: '07', label: 'Juli' },
  { value: '08', label: 'August' },  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' }, { value: '11', label: 'November' },
  { value: '12', label: 'December' },{ value: '01', label: 'Januar' },
];

/** Parses "YYYY-MM-DD" → { year, month }. "YYYY-01-01" = år uden måned → month = '' */
function parseDato(d?: string | null): { year: string; month: string } {
  if (!d) return { year: '', month: '' };
  const [year, month] = d.split('-');
  return { year: year ?? '', month: month === '01' ? '' : (month ?? '') };
}

const TYPE_OPTIONS = [
  { value: 'reduction', label: 'Reduktion' },
  { value: 'adaptation', label: 'Klimatilpasning' },
  { value: 'both', label: 'Begge' },
];
const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planlagt' },
  { value: 'in_progress', label: 'Igangværende' },
  { value: 'completed', label: 'Gennemført' },
  { value: 'discontinued', label: 'Udgået' },
];

export function TiltagForm({
  action, indsatser, defaultValues,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  indsatser: IndsatsOption[];
  defaultValues?: DefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const startDato = parseDato(defaultValues?.tidsrammeStart);
  const slutDato = parseDato(defaultValues?.tidsrammeSlut);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="titel" className="text-sm font-medium text-gray-700">Titel</label>
        <input id="titel" name="titel" type="text" required defaultValue={defaultValues?.titel ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.titel && <p className="text-sm text-red-600">{state.errors.titel[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="indsatsOmraadeId" className="text-sm font-medium text-gray-700">Indsatsområde</label>
        <select id="indsatsOmraadeId" name="indsatsOmraadeId" required defaultValue={defaultValues?.indsatsOmraadeId ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Vælg indsatsområde</option>
          {indsatser.map((io) => <option key={io.id} value={io.id}>{io.navn}</option>)}
        </select>
        {state?.errors?.indsatsOmraadeId && <p className="text-sm text-red-600">{state.errors.indsatsOmraadeId[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm font-medium text-gray-700">Type</label>
          <select id="type" name="type" required defaultValue={defaultValues?.type ?? ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="">Vælg</option>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium text-gray-700">Status</label>
          <select id="status" name="status" defaultValue={defaultValues?.status ?? 'planned'}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="beskrivelse" className="text-sm font-medium text-gray-700">Beskrivelse</label>
        <textarea id="beskrivelse" name="beskrivelse" rows={3} defaultValue={defaultValues?.beskrivelse ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Tidsramme start</label>
          <div className="grid grid-cols-2 gap-2">
            <select name="tidsrammeStartAar" defaultValue={startDato.year}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">År</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select name="tidsrammeStartMaaned" defaultValue={startDato.month}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Hele året</option>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Tidsramme slut</label>
          <div className="grid grid-cols-2 gap-2">
            <select name="tidsrammeSlutAar" defaultValue={slutDato.year}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">År</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select name="tidsrammeSlutMaaned" defaultValue={slutDato.month}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Hele året</option>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="forventetEffektCo2Ton" className="text-sm font-medium text-gray-700">
          Forventet CO₂-effekt (ton/år)
        </label>
        <input id="forventetEffektCo2Ton" name="forventetEffektCo2Ton" type="number" step="0.1"
          defaultValue={defaultValues?.forventetEffektCo2Ton ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>

      {state?.message && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Gemmer…' : 'Gem tiltag'}</Button>
    </form>
  );
}
