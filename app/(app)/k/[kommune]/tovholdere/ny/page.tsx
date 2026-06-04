import { requireKommuneContext } from '@/lib/kommune-context';
import { TovholderForm } from '@/components/tovholder-form';
import { createTovholderAction } from '@/app/(app)/k/[kommune]/tovholdere/actions';
import Link from 'next/link';

export const metadata = { title: 'Ny tovholder — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function NyTovholderPage({ params }: Props) {
  const { kommune: slug } = await params;
  await requireKommuneContext(slug);

  const boundCreate = createTovholderAction.bind(null, slug);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/k/${slug}/tovholdere`} className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Ny tovholder</h1>
      </div>
      <TovholderForm action={boundCreate} />
    </div>
  );
}
