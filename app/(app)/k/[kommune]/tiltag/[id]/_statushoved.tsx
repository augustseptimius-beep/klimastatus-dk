import { tiltagStatusVisning, type TiltagStatus } from '@/lib/merl/tiltag-status';

type Props = {
  titel: string;
  indsatsomraadeNavn: string | null;
  status: TiltagStatus;
  tidsrammeSlut: string | null;
  iDag: string;
  effektSum: number;
  aabneBarrierer: number;
  sidstOpdateret: string | null;
};

export function Statushoved(p: Props) {
  const s = tiltagStatusVisning(p.status, p.tidsrammeSlut, p.iDag);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {p.indsatsomraadeNavn && (
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{p.indsatsomraadeNavn}</span>
      )}
      <h1 className="mt-1 text-xl font-bold text-gray-900">{p.titel}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.farve}`}>{s.label}</span>
        {s.forsinket && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">Forsinket</span>
        )}
        <span className="text-sm text-gray-700">
          <strong>{p.effektSum.toLocaleString('da-DK')}</strong> ton CO₂ forventet
        </span>
        <span className={`text-sm ${p.aabneBarrierer > 0 ? 'font-medium text-red-700' : 'text-gray-500'}`}>
          {p.aabneBarrierer} åbne barrierer
        </span>
        <span className="text-sm text-gray-400">
          {p.sidstOpdateret ? `Sidst opdateret ${p.sidstOpdateret}` : 'Ingen status endnu'}
        </span>
      </div>
    </div>
  );
}
