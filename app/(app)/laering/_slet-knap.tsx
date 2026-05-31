'use client';
import { sletLaeringspostAction } from './actions';

export function SletKnap({ id }: { id: string }) {
  return (
    <form action={async () => { await sletLaeringspostAction(id); }}>
      <button type="submit" className="text-xs text-gray-400 hover:text-red-600">Slet</button>
    </form>
  );
}
