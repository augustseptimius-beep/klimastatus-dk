import { requireKommuneContext } from '@/lib/kommune-context';
import { getTovholderById, getAllTiltag, getAssignmentsByTovholderId } from '@/db/queries';
import { redirect } from 'next/navigation';
import { TovholderForm } from '@/components/tovholder-form';
import { updateTovholderAction, assignTiltagAction, removeTiltagAction } from '@/app/(app)/k/[kommune]/tovholdere/actions';
import Link from 'next/link';

export const metadata = { title: 'Administrer tovholder — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string; id: string }> };

export default async function TovholderDetailPage({ params }: Props) {
  const { kommune: slug, id } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const [tovholder, allTiltag, assignments] = await Promise.all([
    getTovholderById(id),
    getAllTiltag(kommune.id),
    getAssignmentsByTovholderId(id),
  ]);
  if (!tovholder || tovholder.kommuneId !== kommune.id) redirect(`/k/${slug}/tovholdere`);

  const assignedIds = new Set(assignments.map((a) => a.tiltagId));
  const boundUpdate = updateTovholderAction.bind(null, slug, id);

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/k/${slug}/tovholdere`} className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
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
                    ? removeTiltagAction.bind(null, slug, id, t.id)
                    : assignTiltagAction.bind(null, slug, id, t.id)
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
