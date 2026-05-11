import { verifySession } from '@/lib/dal';
import { getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import { TiltagForm } from '@/components/tiltag-form';
import { createTiltagAction } from '@/app/(app)/tiltag/actions';
import Link from 'next/link';

export const metadata = { title: 'Nyt tiltag — Klimastatus.dk' };

export default async function NytTiltagPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const indsatser = await getAllIndsatsOmraader(session.kommuneId);
  if (indsatser.length === 0) redirect('/indsatser');

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/tiltag" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nyt tiltag</h1>
      </div>
      <TiltagForm action={createTiltagAction} indsatser={indsatser} />
    </div>
  );
}
