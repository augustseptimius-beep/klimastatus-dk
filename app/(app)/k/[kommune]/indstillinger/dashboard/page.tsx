import { requireKommuneContext } from '@/lib/kommune-context';
import { getAktiveKommuneIndikatorer } from '@/db/queries/public-dashboard';
import { Composer } from './_composer';
import { definitionListe, DEFINITIONER } from '@/lib/widgets/definitioner';
import { saneerWidgets } from '@/lib/widgets/validering';
import { standardSkabelon } from '@/lib/widgets/standard-skabelon';
import type { WidgetInstans } from '@/lib/widgets/types';

export const metadata = { title: 'Dashboard — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function DashboardComposerPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const indikatorer = await getAktiveKommuneIndikatorer(kommune.id);
  const raw = (kommune.publicWidgets as WidgetInstans[] | null) ?? [];
  const saneret = saneerWidgets(raw, DEFINITIONER);
  const initielle = saneret.length > 0 ? saneret : standardSkabelon();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Offentligt dashboard</h1>
      <p className="mb-6 text-sm text-gray-500">
        Vælg og arrangér de widgets der vises på{' '}
        <a href={`/${kommune.subdomain}`} target="_blank" rel="noopener noreferrer" className="font-mono text-green-700">
          klimastatus.dk/{kommune.subdomain}
        </a>.
      </p>
      <Composer
        slug={slug}
        subdomain={kommune.subdomain}
        initielle={initielle}
        definitioner={definitionListe()}
        indikatorer={indikatorer.map((i) => ({ value: i.id, label: `${i.label} (${i.enhed})` }))}
      />
    </div>
  );
}
