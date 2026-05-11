import { verifySession } from '@/lib/dal';
import { getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'Indsatsområder — Klimastatus.dk' };

const TYPE_LABELS: Record<string, string> = {
  ghg_reduction: 'GHG-reduktion', adaptation: 'Tilpasning',
  consumption: 'Forbrug', just_transition: 'Retfærdig omstilling', cross_cutting: 'Tværgående',
};

export default async function IndsatserPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const indsatser = await getAllIndsatsOmraader(session.kommuneId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Indsatsområder</h1>
        <Link href="/indsatser/ny" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
          Nyt indsatsområde
        </Link>
      </div>
      {indsatser.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-400">
          Ingen indsatsområder endnu. Opret det første for at komme i gang med tiltag.
        </div>
      ) : (
        <div className="divide-y rounded-xl border border-gray-200">
          {indsatser.map((io) => (
            <div key={io.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{io.navn}</p>
                <p className="text-xs text-gray-500">{TYPE_LABELS[io.type]} · {io.sektor}</p>
              </div>
              <Link href={`/indsatser/${io.id}/rediger`} className="text-sm text-gray-500 hover:text-gray-900">
                Rediger
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
