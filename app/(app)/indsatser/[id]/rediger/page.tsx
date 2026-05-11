import { verifySession } from '@/lib/dal';
import { getIndsatsOmraadeById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { IndsatsOmraadeForm } from '@/components/indsats-omraade-form';
import { updateIndsatsOmraadeAction, deleteIndsatsOmraadeAction } from '@/app/(app)/indsatser/actions';
import Link from 'next/link';

export const metadata = { title: 'Rediger indsatsområde — Klimastatus.dk' };

export default async function RedigerIndsatsOmraadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const io = await getIndsatsOmraadeById(id);
  if (!io || io.kommuneId !== session.kommuneId) redirect('/indsatser');

  const boundUpdate = updateIndsatsOmraadeAction.bind(null, id);
  const boundDelete = deleteIndsatsOmraadeAction.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/indsatser" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
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
