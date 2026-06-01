import { notFound } from 'next/navigation';
import { getKommuneBySubdomain } from '@/db/queries/kommune';
import {
  getCo2eSeries,
  getPublicHighlights,
  getStagnerteTiltag,
  getTiltagStatusOversigt,
  getIndsatsomraaderMedTiltagCount,
} from '@/db/queries/public-dashboard';
import { getCctfDaekning } from '@/db/queries/cctf';
import { KlimamaalHero } from './_components/klimamaal-hero';
import { NoegleTalGrid } from './_components/noegletal-grid';
import { TiltagOverblik } from './_components/tiltag-overblik';
import { IndsatsomraaderSektion } from './_components/indsatsomraader-sektion';
import { CctfFold } from './_components/cctf-fold';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const kommune = await getKommuneBySubdomain(slug);
  if (!kommune?.publicEnabled) return {};
  return { title: `${kommune.navn} — Klimastatus` };
}

export default async function PublicDashboardPage({ params }: Props) {
  const { slug } = await params;
  const kommune = await getKommuneBySubdomain(slug);

  if (!kommune || !kommune.publicEnabled) notFound();

  const staleDays = kommune.publicStaleDays ?? 90;
  const highlightIds = kommune.publicHighlights ?? [];
  const maalAar = kommune.klimakommitmentDato
    ? new Date(kommune.klimakommitmentDato).getFullYear()
    : null;

  const [co2eSerie, highlights, stagnerede, tiltagStatus, indsatser, cctfDaekning] =
    await Promise.all([
      getCo2eSeries(kommune.id),
      getPublicHighlights(kommune.id, highlightIds),
      getStagnerteTiltag(kommune.id, staleDays),
      getTiltagStatusOversigt(kommune.id, staleDays),
      getIndsatsomraaderMedTiltagCount(kommune.id),
      getCctfDaekning(kommune.id),
    ]);

  return (
    <>
      <KlimamaalHero
        kommuneNavn={kommune.navn}
        maalAar={maalAar}
        co2eSerie={co2eSerie}
      />
      <NoegleTalGrid highlights={highlights} />
      <TiltagOverblik oversigt={tiltagStatus} stagnerede={stagnerede} />
      <IndsatsomraaderSektion indsatser={indsatser} />
      <CctfFold daekning={cctfDaekning} />
    </>
  );
}
