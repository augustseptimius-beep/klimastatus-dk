'use client';
import { useState } from 'react';
import { useActionState } from 'react';
import { createTemplateAction } from '@/app/admin/indikatorer/actions';
import { Button } from '@/components/ui/button';

const KILDE_EXAMPLES: Record<string, string> = {
  klimaregnskab: JSON.stringify({ type: 'Nøgletal', sektor: 'Samlet' }, null, 2),
  energidataservice: JSON.stringify({ dataset: 'CapacityPerMunicipality', fields: ['OnshoreWindMW', 'SolarPowerMW'] }, null, 2),
  dst: JSON.stringify({ tabel: 'FOLK1A', variabler: { KØN: 'TOT', ALDER: 'IALT' }, felt: 'INDHOLD' }, null, 2),
};

export function IndikatorTemplateForm() {
  const [state, action, pending] = useActionState(createTemplateAction, undefined);
  const [selectedKilde, setSelectedKilde] = useState('klimaregnskab');

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="titel" className="text-sm font-medium text-gray-700">Titel</label>
        <input id="titel" name="titel" type="text" placeholder="Samlet CO₂e pr. capita"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.titel && <p className="text-sm text-red-600">{state.errors.titel[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="kilde" className="text-sm font-medium text-gray-700">Kilde</label>
        <select id="kilde" name="kilde" value={selectedKilde}
          onChange={(e) => setSelectedKilde(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="klimaregnskab">Klimaregnskabet.dk</option>
          <option value="energidataservice">Energi Data Service</option>
          <option value="dst">Danmarks Statistik</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="apiQuery" className="text-sm font-medium text-gray-700">API-query (JSON)</label>
        <textarea id="apiQuery" name="apiQuery" rows={5}
          defaultValue={KILDE_EXAMPLES[selectedKilde]}
          key={selectedKilde}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.apiQuery && <p className="text-sm text-red-600">{state.errors.apiQuery[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="enhed" className="text-sm font-medium text-gray-700">Enhed</label>
        <input id="enhed" name="enhed" type="text" placeholder="ton CO₂e/indb."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.enhed && <p className="text-sm text-red-600">{state.errors.enhed[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="beskrivelse" className="text-sm font-medium text-gray-700">Beskrivelse</label>
        <textarea id="beskrivelse" name="beskrivelse" rows={3}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {state?.errors?.beskrivelse && <p className="text-sm text-red-600">{state.errors.beskrivelse[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cctfKriterier" className="text-sm font-medium text-gray-700">CCTF-kriterier (kommaseparerede tal, f.eks. 6, 11, 15)</label>
        <input id="cctfKriterier" name="cctfKriterier" type="text" placeholder="6, 11, 15"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>

      {state?.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Opretter…' : 'Opret indikator'}
      </Button>
    </form>
  );
}
