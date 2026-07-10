import { redirect } from 'next/navigation';
import { getMagicLinkByTokenHash, hashToken } from '@/db/queries/magic-link';
import { verifyTovholderSession } from '@/lib/tovholder-session';
import { erMagicLinkGyldig } from '@/lib/magic-link-vurdering';
import { indloesMagicLinkAction } from './actions';

export const metadata = { title: 'Tovholder-rapport — Klimastatus.dk' };

/**
 * Bekræftelsesside for magic links. VIGTIGT: GET har ingen side effects —
 * kommunale mailsystemer (Outlook SafeLinks, virus-scannere) forhåndshenter
 * links, og et engangslink må ikke blive brugt af en robot. Selve
 * indløsningen sker først når mennesket klikker knappen (POST).
 */
export default async function MagicLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await getMagicLinkByTokenHash(hashToken(token));

  if (!erMagicLinkGyldig(link)) {
    // Brugt/udløbet link, men en gyldig session i browseren → videre til
    // rapporten (typisk: tovholderen klikker sit eget link igen).
    const session = await verifyTovholderSession();
    if (session) redirect('/rapport');
    redirect('/rapport/udloebet');
  }

  const bekraeft = indloesMagicLinkAction.bind(null, token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Tovholder-rapport</h1>
        <p className="mt-3 text-gray-500">
          Klik på knappen for at åbne din statusrapport.
        </p>
        <form action={bekraeft} className="mt-6">
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700"
          >
            Fortsæt til rapport
          </button>
        </form>
      </div>
    </div>
  );
}
