// Backward-compat redirect — løser gamle bogmærker til /dashboard
import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';

export default async function DashboardRedirect() {
  const session = await verifySession();
  if (!session) redirect('/login');
  if (session.role === 'admin') redirect('/admin/kommuner');

  // Brug kommuneSlug fra session hvis tilgængeligt (nye sessions),
  // ellers DB-opslag som fallback for gamle sessions fra inden deploy.
  const slug =
    session.kommuneSlug ??
    (session.kommuneId ? (await getKommuneById(session.kommuneId))?.subdomain : null);

  if (!slug) redirect('/login');
  redirect(`/k/${slug}/dashboard`);
}
