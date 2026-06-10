import { requireKommuneContext } from '@/lib/kommune-context';
import { getAktiveKommuneIndikatorer } from '@/db/queries/public-dashboard';
import Link from 'next/link';
import { PublicConfigForm } from './_public-config-form';
import { updatePublicConfig } from './public-config-actions';
import { KadenceForm } from './_kadence-form';
import { updateKadenceAction } from './kadence-actions';
import type { IndhentningsKadence } from '@/lib/merl/forespoergsel-status';

export const metadata = { title: 'Indstillinger — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function IndstillingerPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);
  const indikatorer = await getAktiveKommuneIndikatorer(kommune.id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Indstillinger</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Kommuneoplysninger</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Navn</dt>
            <dd className="mt-1 text-gray-900">{kommune.navn}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Kommunekode</dt>
            <dd className="mt-1 text-gray-900">{kommune.kommunekode}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Subdomæne</dt>
            <dd className="mt-1 text-gray-900">{kommune.subdomain}.klimastatus.dk</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Status-indhentning fra tovholdere</h2>
        <p className="mb-4 text-sm text-gray-500">
          Hvor ofte skal tovholdere automatisk bedes om status? Manuel afsendelse fra et tiltag virker altid uanset valg.
        </p>
        <KadenceForm
          initial={kommune.indhentningsKadence as IndhentningsKadence}
          action={updateKadenceAction.bind(null, slug)}
        />
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Offentlig klimaside</h2>
        <p className="mb-6 text-sm text-gray-500">
          Konfigurér den borgervendte side på{' '}
          <span className="font-mono text-gray-700">klimastatus.dk/{kommune.subdomain}</span>.
        </p>
        <PublicConfigForm
          subdomain={kommune.subdomain}
          initialEnabled={kommune.publicEnabled}
          initialStaleDays={kommune.publicStaleDays ?? 90}
          initialHighlights={kommune.publicHighlights ?? []}
          indikatorer={indikatorer}
          action={updatePublicConfig.bind(null, slug)}
        />
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Dashboard-opbygning</h2>
        <p className="mb-4 text-sm text-gray-500">Vælg og arrangér widgets på den offentlige side.</p>
        <Link
          href={`/k/${slug}/indstillinger/dashboard`}
          className="inline-block rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Åbn dashboard-opbygning →
        </Link>
      </div>
    </div>
  );
}
