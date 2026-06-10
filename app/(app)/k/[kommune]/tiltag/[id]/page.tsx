import { requireKommuneContext } from '@/lib/kommune-context';
import { getTiltagDetalje } from '@/db/queries/tiltag-detalje';
import { getBarriereInbox } from '@/db/queries/laeringspost';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Statushoved } from './_statushoved';
import { Sektion } from './_sektion';
import { IndikatorListe } from './_indikator-liste';
import { RapportTidslinje } from './_rapport-tidslinje';
import { LaeringSektion } from './_laering-sektion';
import { opretLaeringspostForTiltagAction } from './actions';
import type { TiltagStatus } from '@/lib/merl/tiltag-status';
import { IndhentStatus } from './_indhent-status';
import { indhentStatusAction } from './actions';
import { erForfalden, nyligAnmodet as erNyligAnmodet } from '@/lib/merl/forespoergsel-status';

export const metadata = { title: 'Tiltag — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string; id: string }> };

export default async function TiltagDetaljePage({ params }: Props) {
  const { kommune: slug, id } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const [detalje, barriereInbox] = await Promise.all([
    getTiltagDetalje(kommune.id, id),
    getBarriereInbox(kommune.id),
  ]);
  if (!detalje) redirect(`/k/${slug}/tiltag`);

  const iDag = new Date().toISOString().slice(0, 10);
  const aabneBarrierer = barriereInbox.filter((b) => b.tiltagId === id).length;
  const sidstOpdateret = detalje.rapporter[0]?.dato ?? null;
  const boundOpret = opretLaeringspostForTiltagAction.bind(null, slug, id);

  const forespoergsler = detalje.forespoergsler;
  const sidstAnmodet = forespoergsler[0]?.sendtAt ?? null;
  const visNyligAnmodet = erNyligAnmodet(sidstAnmodet, iDag);
  // "Forfalden" afledes ved læsning (pg-boss er no-op) — samme mønster som forsinket-overlayet.
  const forfaldne = forespoergsler.filter((f) => erForfalden(f.status, f.sendtAt, iDag)).length;
  const aabneForespoergsler = forespoergsler.filter((f) => f.status === 'sendt').length - forfaldne;
  const boundIndhent = indhentStatusAction.bind(null, slug, id);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/k/${slug}/tiltag`} className="text-sm text-gray-500 hover:text-gray-900">← Alle tiltag</Link>
        <Link href={`/k/${slug}/tiltag/${id}/rediger`} className="ks-btn ks-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}>
          Rediger stamdata
        </Link>
      </div>

      <Statushoved
        titel={detalje.tiltag.titel}
        indsatsomraadeNavn={detalje.indsatsomraadeNavn}
        status={detalje.tiltag.status as TiltagStatus}
        tidsrammeSlut={detalje.tiltag.tidsrammeSlut}
        iDag={iDag}
        effektSum={detalje.effektSum}
        aabneBarrierer={aabneBarrierer}
        sidstOpdateret={sidstOpdateret}
      />

      <IndhentStatus
        action={boundIndhent}
        antalTovholdere={detalje.tovholdere.length}
        sidstAnmodet={sidstAnmodet}
        nyligAnmodet={visNyligAnmodet}
        aabne={aabneForespoergsler}
        forfaldne={forfaldne}
      />

      <Sektion titel="Indikatorer & målinger" resume={`${detalje.indikatorer.length} indikatorer`} aabenFraStart>
        <IndikatorListe indikatorer={detalje.indikatorer} />
      </Sektion>

      <Sektion titel="Tovholder-rapporter" resume={`${detalje.rapporter.length} rapporter`}>
        <RapportTidslinje rapporter={detalje.rapporter} />
      </Sektion>

      <Sektion titel="Læring" resume={`${detalje.laering.length} poster`}>
        <LaeringSektion poster={detalje.laering} iDag={iDag} action={boundOpret} />
      </Sektion>
    </div>
  );
}
