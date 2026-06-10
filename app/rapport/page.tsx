import { cookies } from 'next/headers';
import { decryptTovholder } from '@/lib/tovholder-session';
import { getTovholderById } from '@/db/queries/tovholder';
import { getAabneForespoergslerForTovholder } from '@/db/queries/forespoergsel';
import { ForespoergselForm } from './_forespoergsel-form';

export const metadata = { title: 'Tovholder-rapport — Klimastatus.dk' };

export default async function RapportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tovholder-session')?.value;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md px-6 py-12 text-center">
          <p className="text-gray-500">Ingen aktiv session. Brug linket fra din email.</p>
        </div>
      </div>
    );
  }

  const session = await decryptTovholder(token);
  if (!session || new Date(session.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md px-6 py-12 text-center">
          <p className="text-gray-500">Din session er udløbet. Brug linket fra din email igen.</p>
        </div>
      </div>
    );
  }

  const [tovholder, forespoergsler] = await Promise.all([
    getTovholderById(session.tovholderId),
    getAabneForespoergslerForTovholder(session.tovholderId),
  ]);

  if (!tovholder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Tovholder ikke fundet.</p>
      </div>
    );
  }

  const aktiv = forespoergsler[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Hej {tovholder.navn}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {forespoergsler.length === 0
              ? 'Du har ingen åbne forespørgsler lige nu. Tak!'
              : `Du har ${forespoergsler.length} ${forespoergsler.length === 1 ? 'forespørgsel' : 'forespørgsler'}. Besvar én ad gangen.`}
          </p>
        </div>

        {aktiv && (
          <ForespoergselForm
            aktiv={{ id: aktiv.id, tiltagTitel: aktiv.tiltagTitel, spoergsmaal: aktiv.spoergsmaal }}
            antal={forespoergsler.length}
            position={1}
          />
        )}
      </div>
    </div>
  );
}
