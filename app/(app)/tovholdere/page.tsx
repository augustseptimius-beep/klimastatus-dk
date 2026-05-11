import { verifySession } from '@/lib/dal';
import { getAllTovholdere } from '@/db/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { sendRundeAction } from './actions';

export const metadata = { title: 'Tovholdere — Klimastatus.dk' };

export default async function TovholderePage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const tovholdere = await getAllTovholdere(session.kommuneId);
  const aktive = tovholdere.filter((t) => t.aktiv);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tovholdere</h1>
        <div className="flex gap-3">
          {aktive.length > 0 && (
            <form action={sendRundeAction}>
              <button type="submit"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Send runde ({aktive.length} tovholdere)
              </button>
            </form>
          )}
          <Link href="/tovholdere/ny"
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
                {!th.aktiv && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inaktiv</span>}
                <Link href={`/tovholdere/${th.id}`} className="text-sm text-gray-500 hover:text-gray-900">
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
