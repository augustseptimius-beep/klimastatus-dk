import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { getKommuneBySubdomain } from '@/db/queries/kommune';
import type { SessionPayload } from '@/lib/definitions';

type KommuneRow = NonNullable<Awaited<ReturnType<typeof getKommuneBySubdomain>>>;

export type KommuneContext = {
  session: SessionPayload;
  kommune: KommuneRow;
};

/**
 * Verificerer session og kommuneadgang ud fra URL-slug.
 * - Admin → adgang til alle kommuner.
 * - Koordinator → kun hvis session.kommuneId === kommune.id.
 * - Ukendt slug → notFound (404, ingen lækage).
 * - Ingen session → redirect til /login.
 */
export async function requireKommuneContext(slug: string): Promise<KommuneContext> {
  const session = await verifySession();
  if (!session) redirect('/login');

  const kommune = await getKommuneBySubdomain(slug);
  if (!kommune) notFound();

  if (session.role === 'koordinator' && session.kommuneId !== kommune.id) {
    notFound();
  }

  return { session, kommune };
}
