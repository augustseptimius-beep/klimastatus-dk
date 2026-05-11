import { verifySession } from '@/lib/dal';
import { getAllTiltag, getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'Handlingsoverblik — Klimastatus.dk' };

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planlagt', in_progress: 'Igangværende',
  completed: 'Gennemført', discontinued: 'Udgået',
};
const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700', discontinued: 'bg-red-100 text-red-700',
};

export default async function TiltagPage({
  searchParams,
}: {
  searchParams: Promise<{ indsats?: string; status?: string }>;
}) {
  const { indsats, status } = await searchParams;
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [allTiltag, indsatser] = await Promise.all([
    getAllTiltag(session.kommuneId),
    getAllIndsatsOmraader(session.kommuneId),
  ]);

  const filtered = allTiltag.filter((t) => {
    if (indsats && t.indsatsOmraadeId !== indsats) return false;
    if (status && t.status !== status) return false;
    return true;
  });

  const indsatsMap = Object.fromEntries(indsatser.map((io) => [io.id, io.navn]));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Handlingsoverblik</h1>
        <Link href="/tiltag/ny" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
          Nyt tiltag
        </Link>
      </div>

      {/* Indsatsområde filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/tiltag" className={`rounded-full px-3 py-1 text-xs font-medium ${!indsats ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Alle
        </Link>
        {indsatser.map((io) => (
          <Link key={io.id} href={`/tiltag?indsats=${io.id}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${indsats === io.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {io.navn}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-400">
          {allTiltag.length === 0
            ? 'Ingen tiltag endnu. Opret et indsatsområde først, derefter kan du tilføje tiltag.'
            : 'Ingen tiltag matcher filteret.'}
        </div>
      ) : (
        <div className="divide-y rounded-xl border border-gray-200">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{t.titel}</p>
                <p className="mt-0.5 text-xs text-gray-500">{indsatsMap[t.indsatsOmraadeId]}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                  {STATUS_LABELS[t.status]}
                </span>
                <Link href={`/tiltag/${t.id}/rediger`} className="text-sm text-gray-500 hover:text-gray-900">
                  Rediger
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
