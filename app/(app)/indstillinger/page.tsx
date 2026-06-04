// Backward-compat redirect — løser gamle bogmærker til /indstillinger
import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';

export default async function IndstillingerRedirect() {
  const session = await verifySession();
  if (!session) redirect('/login');
  if (session.role === 'admin') redirect('/admin/kommuner');

  const slug =
    session.kommuneSlug ??
    (session.kommuneId ? (await getKommuneById(session.kommuneId))?.subdomain : null);

  if (!slug) redirect('/login');
  redirect(`/k/${slug}/indstillinger`);
}
