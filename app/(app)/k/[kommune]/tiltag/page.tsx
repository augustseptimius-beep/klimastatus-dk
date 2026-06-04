import { requireKommuneContext } from '@/lib/kommune-context';
import { getAllTiltag, getAllIndsatsOmraader } from '@/db/queries';
import Link from 'next/link';
import { TiltagTable } from '@/app/(app)/tiltag/tiltag-table';

export const metadata = { title: 'Handlingsoverblik — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function TiltagPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const [allTiltag, indsatser] = await Promise.all([
    getAllTiltag(kommune.id),
    getAllIndsatsOmraader(kommune.id),
  ]);

  return (
    <>
      <div className="ks-page-header">
        <div>
          <div className="eyebrow">Klimaplan</div>
          <h1>Handlingsoverblik</h1>
        </div>
        <div className="actions">
          <Link href={`/k/${slug}/tiltag/ny`} className="ks-btn ks-btn-primary">+ Ny handling</Link>
        </div>
      </div>

      <TiltagTable tiltag={allTiltag} indsatser={indsatser} slug={slug} />
    </>
  );
}
