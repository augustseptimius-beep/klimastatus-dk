import { CreateKommuneForm } from '@/components/create-kommune-form';
import Link from 'next/link';

export const metadata = { title: 'Opret kommune — Admin' };

export default function NyKommunePage() {
  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/admin/kommuner" className="text-sm text-gray-500 hover:text-gray-900">
          ← Tilbage til kommuner
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Opret ny kommune</h1>
        <p className="mt-1 text-sm text-gray-500">
          Subdomænet genereres automatisk fra kommunenavnet.
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <CreateKommuneForm />
      </div>
    </div>
  );
}
