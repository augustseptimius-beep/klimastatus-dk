import { verifySession } from '@/lib/dal';
import { getTovholderById, getAllTiltag, getAssignmentsByTovholderId } from '@/db/queries';
import { redirect } from 'next/navigation';
import { TovholderForm } from '@/components/tovholder-form';
import { updateTovholderAction, assignTiltagAction, removeTiltagAction } from '@/app/(app)/tovholdere/actions';
import Link from 'next/link';

export const metadata = { title: 'Administrer tovholder — Klimastatus.dk' };

export default async function TovholderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [tovholder, allTiltag, assignments] = await Promise.all([
    getTovholderById(id),
    getAllTiltag(session.kommuneId),
    getAssignmentsByTovholderId(id),
  ]);
  if (!tovholder || tovholder.kommuneId !== session.kommuneId) redirect('/tovholdere');

  const assignedIds = new Set(assignments.map((a) => a.tiltagId));
  const boundUpdate = updateTovholderAction.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/tovholdere" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">{tovholder.navn}</h1>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Stamdata</h2>
        <TovholderForm action={boundUpdate} defaultValues={tovholder} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Tiltag ({assignedIds.size})</h2>
        {allTiltag.length === 0 ? (
          <p className="text-sm text-gray-500">Ingen tiltag oprettet endnu.</p>
        ) : (
          <div className="divide-y rounded-xl border border-gray-200">
            {allTiltag.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-gray-900">{t.titel}</p>
                <form action={
                  assignedIds.has(t.id)
                    ? removeTiltagAction.bind(null, id, t.id)
                    : assignTiltagAction.bind(null, id, t.id)
                }>
                  <button type="submit"
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      assignedIds.has(t.id)
                        ? 'bg-gray-900 text-white hover:bg-gray-700'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {assignedIds.has(t.id) ? 'Fjern' : 'Tilknyt'}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
