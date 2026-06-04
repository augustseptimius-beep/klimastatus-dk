import { requireKommuneContext } from '@/lib/kommune-context';
import { IndsatsOmraadeForm } from '@/components/indsats-omraade-form';
import { createIndsatsOmraadeAction } from '@/app/(app)/k/[kommune]/indsatser/actions';
import Link from 'next/link';

export const metadata = { title: 'Nyt indsatsområde — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function NytIndsatsOmraadePage({ params }: Props) {
  const { kommune: slug } = await params;
  await requireKommuneContext(slug);

  const boundCreate = createIndsatsOmraadeAction.bind(null, slug);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/k/${slug}/indsatser`} className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nyt indsatsområde</h1>
      </div>
      <IndsatsOmraadeForm action={boundCreate} />
    </div>
  );
}
