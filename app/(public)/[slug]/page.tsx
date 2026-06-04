import { notFound } from 'next/navigation';
import { getKommuneBySubdomain } from '@/db/queries/kommune';
import { SERVER_REGISTRY, type WidgetCtx } from '@/lib/widgets/server-registry';
import { DEFINITIONER } from '@/lib/widgets/definitioner';
import { saneerWidgets } from '@/lib/widgets/validering';
import { standardSkabelon } from '@/lib/widgets/standard-skabelon';
import { WidgetGrid, type GridItem } from './_components/widget-grid';
import type { WidgetInstans } from '@/lib/widgets/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const kommune = await getKommuneBySubdomain(slug);
  if (!kommune?.publicEnabled) return {};
  return { title: `${kommune.navn} — Klimastatus` };
}

export default async function PublicDashboardPage({ params }: Props) {
  const { slug } = await params;
  const kommune = await getKommuneBySubdomain(slug);
  if (!kommune || !kommune.publicEnabled) notFound();

  const raw = (kommune.publicWidgets as WidgetInstans[] | null) ?? [];
  const saneret = saneerWidgets(raw, DEFINITIONER);
  const widgets = saneret.length > 0 ? saneret : standardSkabelon();

  const ctx: WidgetCtx = {
    kommuneNavn: kommune.navn,
    nuAar: new Date().getFullYear(),
    befolkningstal: kommune.befolkningstal ?? null,
  };

  const aktive = widgets.filter((w) => w.enabled);
  const items: GridItem[] = await Promise.all(
    aktive.map(async (w) => {
      const reg = SERVER_REGISTRY[w.type];
      const data = await reg.loadData(kommune.id, w.config, ctx);
      const Comp = reg.Component;
      return {
        id: w.id,
        bredde: w.width,
        node: <Comp data={data as never} config={w.config} width={w.width} />,
      };
    }),
  );

  return <WidgetGrid items={items} />;
}
