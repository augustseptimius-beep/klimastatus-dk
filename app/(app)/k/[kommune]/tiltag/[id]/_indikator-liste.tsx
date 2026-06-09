import type { IndikatorMedMaaling } from '@/db/queries/tiltag-detalje';

const NIVEAU_LABEL: Record<string, string> = {
  output: 'Output', outcome: 'Outcome', impact: 'Impact',
};

export function IndikatorListe({ indikatorer }: { indikatorer: IndikatorMedMaaling[] }) {
  if (indikatorer.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400">
        Ingen indikatorer endnu — tilføj den første under Indikatorer.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {indikatorer.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-4 py-2">
          <div>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              {NIVEAU_LABEL[i.niveau] ?? i.niveau}
            </span>
            <p className="mt-0.5 text-sm text-gray-900">{i.beskrivelse}</p>
          </div>
          <div className="shrink-0 text-right">
            {i.senesteVaerdi != null ? (
              <>
                <p className="text-sm font-semibold text-gray-900">
                  {i.senesteVaerdi}{i.enhed ? ` ${i.enhed}` : ''}
                </p>
                <p className="text-xs text-gray-400">
                  {i.senesteDato ?? (i.senesteAar != null ? String(i.senesteAar) : '')}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400">Ingen måling</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
