import { requireKommuneContext } from '@/lib/kommune-context';
import { ImporterClient } from '@/app/(app)/indsatser/importer/importer-client';

export const metadata = { title: 'Importer handlingskatalog — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function ImporterPage({ params }: Props) {
  const { kommune: slug } = await params;
  await requireKommuneContext(slug);

  return <ImporterClient slug={slug} />;
}
