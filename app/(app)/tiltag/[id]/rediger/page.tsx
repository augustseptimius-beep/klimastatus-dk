import { verifySession } from '@/lib/dal';
import { getTiltagById, getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import { TiltagForm } from '@/components/tiltag-form';
import { updateTiltagAction } from '@/app/(app)/tiltag/actions';
import Link from 'next/link';

export const metadata = { title: 'Rediger tiltag — Klimastatus.dk' };

export default async function RedigerTiltagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [tiltag, indsatser] = await Promise.all([
    getTiltagById(id),
    getAllIndsatsOmraader(session.kommuneId),
  ]);
  if (!tiltag || tiltag.kommuneId !== session.kommuneId) redirect('/tiltag');

  const boundUpdate = updateTiltagAction.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/tiltag" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Rediger tiltag</h1>
      </div>
      <TiltagForm action={boundUpdate} indsatser={indsatser} defaultValues={tiltag} />
    </div>
  );
}
