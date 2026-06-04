import { requireKommuneContext } from '@/lib/kommune-context';
import { getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import { TiltagForm } from '@/components/tiltag-form';
import { createTiltagAction } from '@/app/(app)/k/[kommune]/tiltag/actions';
import Link from 'next/link';

export const metadata = { title: 'Nyt tiltag — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function NytTiltagPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const indsatser = await getAllIndsatsOmraader(kommune.id);
  if (indsatser.length === 0) redirect(`/k/${slug}/indsatser`);

  const boundCreate = createTiltagAction.bind(null, slug);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/k/${slug}/tiltag`} className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nyt tiltag</h1>
      </div>
      <TiltagForm action={boundCreate} indsatser={indsatser} />
    </div>
  );
}
