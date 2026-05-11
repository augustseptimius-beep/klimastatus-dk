import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Indstillinger — Klimastatus.dk' };

export default async function IndstillingerPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const kommune = await getKommuneById(session.kommuneId);
  if (!kommune) redirect('/login');

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Indstillinger</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Kommuneoplysninger</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Navn</dt>
            <dd className="mt-1 text-gray-900">{kommune.navn}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Kommunekode</dt>
            <dd className="mt-1 text-gray-900">{kommune.kommunekode}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Subdomæne</dt>
            <dd className="mt-1 text-gray-900">{kommune.subdomain}.klimastatus.dk</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Befolkningstal</dt>
            <dd className="mt-1 text-gray-900">{kommune.befolkningstal?.toLocaleString('da-DK') ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-400">
        Redigering af indstillinger tilføjes i en senere fase.
      </div>
    </div>
  );
}
