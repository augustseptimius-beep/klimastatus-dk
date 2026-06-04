'use client';
import { sletLaeringspostAction } from './actions';

export function SletKnap({ slug, id }: { slug: string; id: string }) {
  return (
    <form action={async () => { await sletLaeringspostAction(slug, id); }}>
      <button type="submit" className="text-xs text-gray-400 hover:text-red-600">Slet</button>
    </form>
  );
}
