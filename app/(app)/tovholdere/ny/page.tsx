import { TovholderForm } from '@/components/tovholder-form';
import { createTovholderAction } from '@/app/(app)/tovholdere/actions';
import Link from 'next/link';

export const metadata = { title: 'Ny tovholder — Klimastatus.dk' };

export default function NyTovholderPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/tovholdere" className="text-sm text-gray-500 hover:text-gray-900">← Tilbage</Link>
        <h1 className="text-2xl font-bold text-gray-900">Ny tovholder</h1>
      </div>
      <TovholderForm action={createTovholderAction} />
    </div>
  );
}
