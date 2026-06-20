import { PROVENANS_LABEL, type DataProvenans } from '@/lib/datahub/provenans';

export function ProvenansBadge({ provenans }: { provenans: DataProvenans | null }) {
  if (!provenans) return null;
  const erLokal = provenans === 'bottom_up';
  const stil = erLokal ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${stil}`}>{PROVENANS_LABEL[provenans]}</span>
  );
}
