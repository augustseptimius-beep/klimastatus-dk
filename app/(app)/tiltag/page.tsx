import { verifySession } from '@/lib/dal';
import { getAllTiltag, getAllIndsatsOmraader } from '@/db/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TiltagTable } from './tiltag-table';

export const metadata = { title: 'Handlingsoverblik — Klimastatus.dk' };

export default async function TiltagPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [allTiltag, indsatser] = await Promise.all([
    getAllTiltag(session.kommuneId),
    getAllIndsatsOmraader(session.kommuneId),
  ]);

  return (
    <>
      <div className="ks-page-header">
        <div>
          <div className="eyebrow">Klimaplan</div>
          <h1>Handlingsoverblik</h1>
        </div>
        <div className="actions">
          <Link href="/tiltag/ny" className="ks-btn ks-btn-primary">+ Ny handling</Link>
        </div>
      </div>

      <TiltagTable tiltag={allTiltag} indsatser={indsatser} />
    </>
  );
}
