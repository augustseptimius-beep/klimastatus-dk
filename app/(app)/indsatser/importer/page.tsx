import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { getKommuneById } from '@/db/queries/kommune';
import { ImporterClient } from './importer-client';

export const metadata = { title: 'Importer handlingskatalog — Klimastatus.dk' };

export default async function ImporterPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const kommune = await getKommuneById(session.kommuneId);
  if (!kommune) redirect('/login');

  return <ImporterClient slug={kommune.subdomain} />;
}
