import { requireKommuneContext } from '@/lib/kommune-context';
import { getIndsatsOmraadeById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { IndsatsOmraadeForm } from '@/components/indsats-omraade-form';
import { updateIndsatsOmraadeAction, deleteIndsatsOmraadeAction } from '@/app/(app)/k/[kommune]/indsatser/actions';
import Link from 'next/link';

export const metadata = { title: 'Rediger indsatsområde — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string; id: string }> };

export default async function RedigerIndsatsOmraadePage({ params }: Props) {
  const { kommune: slug, id } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const io = await getIndsatsOmraadeById(id);
  if (!io || io.kommuneId !== kommune.id) redirect(`/k/${slug}/indsatser`);

  const boundUpdate = updateIndsatsOmraadeAction.bind(null, slug, id);
  const boundDelete = deleteIndsatsOmraadeAction.bind(null, slug, id);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/k/${slug}/indsatser`} className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Rediger indsatsområde</h1>
      </div>
      <IndsatsOmraadeForm action={boundUpdate} defaultValues={io} />
      <form action={boundDelete} className="mt-8">
        <button type="submit" className="text-sm text-red-600 hover:text-red-800">
          Slet indsatsområde
        </button>
      </form>
    </div>
  );
}
