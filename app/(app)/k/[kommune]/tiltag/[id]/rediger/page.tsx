import { requireKommuneContext } from '@/lib/kommune-context';
import { getTiltagById, getAllIndsatsOmraader, getAllTovholdere, getTiltagTovholdere, getTiltagEffekter } from '@/db/queries';
import { redirect } from 'next/navigation';
import { TiltagForm } from '@/components/tiltag-form';
import type { EffektRow } from '@/components/tiltag-effekt-liste';
import { updateTiltagAction } from '@/app/(app)/k/[kommune]/tiltag/actions';
import Link from 'next/link';

export const metadata = { title: 'Rediger tiltag — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string; id: string }> };

export default async function RedigerTiltagPage({ params }: Props) {
  const { kommune: slug, id } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const [tiltag, indsatser, tovholdere, selectedTovholderIds, effekterRaa] = await Promise.all([
    getTiltagById(id),
    getAllIndsatsOmraader(kommune.id),
    getAllTovholdere(kommune.id),
    getTiltagTovholdere(id),
    getTiltagEffekter(id),
  ]);
  if (!tiltag || tiltag.kommuneId !== kommune.id) redirect(`/k/${slug}/tiltag`);

  const effekter: EffektRow[] = effekterRaa.map((e) => ({
    kategori: e.kategori,
    vaerdi: e.vaerdi != null ? String(e.vaerdi) : '',
    enhed: e.enhed ?? '',
    beskrivelse: e.beskrivelse ?? '',
  }));

  const boundUpdate = updateTiltagAction.bind(null, slug, id);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/k/${slug}/tiltag`} className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Rediger tiltag</h1>
      </div>
      <TiltagForm
        action={boundUpdate}
        indsatser={indsatser}
        defaultValues={tiltag}
        tovholdere={tovholdere}
        selectedTovholderIds={selectedTovholderIds}
        effekter={effekter}
      />
    </div>
  );
}
