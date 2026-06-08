import { requireKommuneContext } from '@/lib/kommune-context';
import { getAllTiltag, getAllIndsatsOmraader, getCo2SumForTiltag } from '@/db/queries';
import Link from 'next/link';
import { TiltagTable } from './tiltag-table';

export const metadata = { title: 'Handlingsoverblik — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function TiltagPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const [allTiltag, indsatser] = await Promise.all([
    getAllTiltag(kommune.id),
    getAllIndsatsOmraader(kommune.id),
  ]);

  const co2Sum = await getCo2SumForTiltag(allTiltag.map((t) => t.id));
  const tiltagMedCo2 = allTiltag.map((t) => ({ ...t, forventetEffektCo2Ton: co2Sum.get(t.id) ?? null }));

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

      <TiltagTable tiltag={tiltagMedCo2} indsatser={indsatser} slug={slug} />
    </>
  );
}
