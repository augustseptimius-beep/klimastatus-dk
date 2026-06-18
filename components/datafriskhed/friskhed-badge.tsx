import type { FriskhedsNiveau } from '@/lib/datafriskhed/motor';

const STIL: Record<FriskhedsNiveau, string> = {
  frisk: 'text-green-600',
  snart: 'text-yellow-600',
  forældet: 'text-red-600',
};

const IKON: Record<FriskhedsNiveau, string> = { frisk: '', snart: '⚠', forældet: '⚠' };

export function FriskhedBadge({ niveau, besked }: { niveau: FriskhedsNiveau; besked: string }) {
  return (
    <span className={`text-xs ${STIL[niveau]}`}>
      {IKON[niveau] && `${IKON[niveau]} `}{besked}
    </span>
  );
}

/** Banner-variant til /dashboard + /data (kun snart/forældet). */
export function FriskhedBanner({
  niveau,
  besked,
  href,
}: {
  niveau: FriskhedsNiveau;
  besked: string;
  href?: string;
}) {
  const farve =
    niveau === 'forældet'
      ? 'border-red-300 bg-red-50 text-red-800'
      : 'border-yellow-300 bg-yellow-50 text-yellow-800';
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${farve}`}>
      ⚠ {besked}{' '}
      {href && (
        <a href={href} className="underline">
          Gå til data
        </a>
      )}
    </div>
  );
}
