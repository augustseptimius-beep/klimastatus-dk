'use client';
import { useState, useTransition } from 'react';
import { hentNuAction } from './actions';

export function HentNuKnap({ slug, kommuneIndikatorId }: { slug: string; kommuneIndikatorId: string }) {
  const [isPending, startTransition] = useTransition();
  const [afsendt, setAfsendt] = useState(false);

  function klik() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('fromYear', '');
      await hentNuAction(slug, kommuneIndikatorId, undefined, fd);
      setAfsendt(true);
      setTimeout(() => setAfsendt(false), 3000);
    });
  }

  return (
    <button
      type="button"
      onClick={klik}
      disabled={isPending || afsendt}
      className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
    >
      {isPending ? 'Sender…' : afsendt ? 'Job afsendt ✓' : 'Hent nu'}
    </button>
  );
}
