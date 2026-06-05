import { requireKommuneContext } from '@/lib/kommune-context';
import { SkabelonImporterClient } from './skabelon-importer-client';

export const metadata = { title: 'Importer skabelon — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function ImporterSkabelonPage({ params }: Props) {
  const { kommune: slug } = await params;
  await requireKommuneContext(slug);
  return <SkabelonImporterClient slug={slug} />;
}
