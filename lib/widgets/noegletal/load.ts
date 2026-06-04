import { getPublicHighlights, type PublicHighlight } from '@/db/queries/public-dashboard';

export type NoegletalData = PublicHighlight[];

export async function loadData(kommuneId: string, config: Record<string, unknown>): Promise<NoegletalData> {
  const ids = Array.isArray(config.indikatorer) ? (config.indikatorer as string[]) : [];
  return getPublicHighlights(kommuneId, ids);
}
