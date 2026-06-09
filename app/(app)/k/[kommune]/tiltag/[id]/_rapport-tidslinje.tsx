import type { RapportForTiltag } from '@/db/queries/tiltag-detalje';

export function RapportTidslinje({ rapporter }: { rapporter: RapportForTiltag[] }) {
  if (rapporter.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400">
        Ingen tovholder-rapporter endnu.
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {rapporter.map((r, idx) => (
        <li key={r.id} className="rounded-lg border border-gray-100 px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-700">{r.tovholderNavn} · {r.dato}</p>
            {idx === 0 && <span className="text-[10px] font-medium text-green-700">Seneste</span>}
          </div>
          {r.statusImplementering && <p className="mt-1 text-sm text-gray-900">{r.statusImplementering}</p>}
          {r.barrierer && <p className="mt-1 text-xs text-red-700">Barriere: {r.barrierer}</p>}
          {r.naesteSkrid && <p className="mt-1 text-xs text-gray-500">Næste skridt: {r.naesteSkrid}</p>}
          {r.effektRealiseret && <p className="mt-1 text-xs text-gray-500">Realiseret effekt: {r.effektRealiseret}</p>}
        </li>
      ))}
    </ol>
  );
}
