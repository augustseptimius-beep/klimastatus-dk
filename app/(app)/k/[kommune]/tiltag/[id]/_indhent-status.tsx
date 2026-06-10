'use client';
import { useState } from 'react';

type Props = {
  action: (formData: FormData) => Promise<void>;
  antalTovholdere: number;
  sidstAnmodet: string | null;
  nyligAnmodet: boolean;
};

export function IndhentStatus({ action, antalTovholdere, sidstAnmodet, nyligAnmodet }: Props) {
  const [aaben, setAaben] = useState(false);

  if (antalTovholdere === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 px-5 py-4 text-sm text-gray-500">
        Ingen tovholder er tilknyttet dette tiltag endnu. Tilføj en under <strong>Tovholdere</strong> for at kunne indhente status.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Indhent status fra tovholder</h2>
          <p className="text-xs text-gray-500">
            Sender et magic-link til {antalTovholdere === 1 ? 'tovholderen' : `${antalTovholdere} tovholdere`}.
            {sidstAnmodet ? ` Sidst anmodet ${sidstAnmodet.slice(0, 10)}.` : ' Ikke anmodet endnu.'}
          </p>
        </div>
        {!aaben && (
          <button onClick={() => setAaben(true)} className="ks-btn ks-btn-primary shrink-0" style={{ padding: '8px 14px', fontSize: 13 }}>
            Indhent status
          </button>
        )}
      </div>

      {aaben && (
        <form action={action} className="mt-4 space-y-3">
          {nyligAnmodet && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Du anmodede for nylig. Send kun igen hvis det er nødvendigt.
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Konkret spørgsmål (valgfrit)</label>
            <textarea
              name="spoergsmaal"
              rows={2}
              placeholder="F.eks. 'Er de sidste 2 busser sat i drift?'"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className="ks-btn ks-btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
              Send forespørgsel
            </button>
            <button type="button" onClick={() => setAaben(false)} className="text-sm text-gray-500 hover:text-gray-900">
              Annullér
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
