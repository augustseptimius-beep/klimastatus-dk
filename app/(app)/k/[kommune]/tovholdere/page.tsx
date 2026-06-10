import { requireKommuneContext } from '@/lib/kommune-context';
import { getAllTovholdere } from '@/db/queries';
import { getRundeStatusForKommune, type TovholderRundeStatus } from '@/db/queries/magic-link';
import Link from 'next/link';
import { sendRundeAction } from './actions';

export const metadata = { title: 'Tovholdere — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

function formaterDato(d: Date): string {
  return new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short' }).format(d);
}

function RundeStatusBadge({ status }: { status: TovholderRundeStatus | undefined }) {
  if (!status) {
    return <span className="text-xs text-gray-400">Ingen runde sendt</span>;
  }
  if (status.harSvaret) {
    return (
      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
        Har svaret
      </span>
    );
  }
  const rykket = status.rykkerAntal > 0
    ? ` · rykket ${status.rykkerAntal} ${status.rykkerAntal === 1 ? 'gang' : 'gange'}`
    : '';
  const opgivet = status.rykkerAntal >= 2 ? ' — ingen flere automatiske rykkere' : '';
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
      Afventer svar (sendt {formaterDato(status.linkSendtAt)}){rykket}{opgivet}
    </span>
  );
}

export default async function TovholderePage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const [tovholdere, rundeStatus] = await Promise.all([
    getAllTovholdere(kommune.id),
    getRundeStatusForKommune(kommune.id),
  ]);
  const aktive = tovholdere.filter((t) => t.aktiv);

  const boundSendRunde = sendRundeAction.bind(null, slug);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tovholdere</h1>
        <div className="flex gap-3">
          {aktive.length > 0 && (
            <form action={boundSendRunde}>
              <button type="submit"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Send runde ({aktive.length} tovholdere)
              </button>
            </form>
          )}
          <Link href={`/k/${slug}/tovholdere/ny`}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
            Ny tovholder
          </Link>
        </div>
      </div>

      {tovholdere.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-400">
          Ingen tovholdere endnu.
        </div>
      ) : (
        <div className="divide-y rounded-xl border border-gray-200">
          {tovholdere.map((th) => (
            <div key={th.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{th.navn}</p>
                <p className="text-xs text-gray-500">{th.email}{th.forvaltning ? ` · ${th.forvaltning}` : ''}</p>
              </div>
              <div className="flex items-center gap-4">
                {th.aktiv && <RundeStatusBadge status={rundeStatus.get(th.id)} />}
                {!th.aktiv && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inaktiv</span>}
                <Link href={`/k/${slug}/tovholdere/${th.id}`} className="text-sm text-gray-500 hover:text-gray-900">
                  Administrer
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
