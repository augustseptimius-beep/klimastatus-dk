import { cookies } from 'next/headers';
import { decryptTovholder } from '@/lib/tovholder-session';
import { getTovholderById } from '@/db/queries/tovholder';
import { getTiltagForTovholder } from '@/db/queries/tiltag';
import { getLatestRapporterForTovholder } from '@/db/queries/rapport';
import { TovholderRapportForm } from '@/components/tovholder-rapport-form';

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

  const [tovholder, tiltagListe, rapporter] = await Promise.all([
    getTovholderById(session.tovholderId),
    getTiltagForTovholder(session.tovholderId),
    getLatestRapporterForTovholder(session.tovholderId),
  ]);

  if (!tovholder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Tovholder ikke fundet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Hej {tovholder.navn}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Udfyld status for dine tiltag nedenfor. Du kan gemme og vende tilbage inden deadline.
          </p>
        </div>
        <TovholderRapportForm tiltag={tiltagListe} rapporter={rapporter} />
      </div>
    </div>
  );
}
