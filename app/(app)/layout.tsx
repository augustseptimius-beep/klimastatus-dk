import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session || session.role !== 'koordinator') redirect('/login');

  const kommune = session.kommuneId
    ? await getKommuneById(session.kommuneId)
    : null;

  if (!kommune) redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar kommuneNavn={kommune.navn} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="mx-auto max-w-4xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
