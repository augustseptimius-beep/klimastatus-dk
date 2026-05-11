import { IndsatsOmraadeForm } from '@/components/indsats-omraade-form';
import { createIndsatsOmraadeAction } from '@/app/(app)/indsatser/actions';
import Link from 'next/link';

export const metadata = { title: 'Nyt indsatsområde — Klimastatus.dk' };

export default function NytIndsatsOmraadePage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/indsatser" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nyt indsatsområde</h1>
      </div>
      <IndsatsOmraadeForm action={createIndsatsOmraadeAction} />
    </div>
  );
}
