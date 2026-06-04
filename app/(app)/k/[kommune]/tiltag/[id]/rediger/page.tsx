import { requireKommuneContext } from '@/lib/kommune-context';
import { getTiltagById, getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import { TiltagForm } from '@/components/tiltag-form';
import { updateTiltagAction } from '@/app/(app)/k/[kommune]/tiltag/actions';
import Link from 'next/link';

export const metadata = { title: 'Rediger tiltag — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string; id: string }> };

export default async function RedigerTiltagPage({ params }: Props) {
  const { kommune: slug, id } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const [tiltag, indsatser] = await Promise.all([
    getTiltagById(id),
    getAllIndsatsOmraader(kommune.id),
  ]);
  if (!tiltag || tiltag.kommuneId !== kommune.id) redirect(`/k/${slug}/tiltag`);

  const boundUpdate = updateTiltagAction.bind(null, slug, id);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/k/${slug}/tiltag`} className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Rediger tiltag</h1>
      </div>
      <TiltagForm action={boundUpdate} indsatser={indsatser} defaultValues={tiltag} />
    </div>
  );
}
