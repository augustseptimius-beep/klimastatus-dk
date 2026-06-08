'use client';
import { useState } from 'react';
import { EFFEKT_KATEGORIER, standardEnhedFor } from '@/lib/tiltag/effekt-kategorier';

export type EffektRow = {
  kategori: string | null;
  vaerdi: string;   // holdes som streng i UI
  enhed: string;
  beskrivelse: string;
};

const TOM_STRUKTURERET: EffektRow = { kategori: 'co2_reduktion', vaerdi: '', enhed: standardEnhedFor('co2_reduktion'), beskrivelse: '' };

export function TiltagEffektListe({ initielle = [] }: { initielle?: EffektRow[] }) {
  const [rows, setRows] = useState<EffektRow[]>(initielle.length > 0 ? initielle : [TOM_STRUKTURERET]);

  // Serialisér til skjult input (kun ikke-tomme felter; server normaliserer endeligt)
  const serialiseret = JSON.stringify(
    rows.map((r) => ({
      kategori: r.kategori,
      vaerdi: r.vaerdi.trim() === '' ? null : Number(r.vaerdi.replace(',', '.')),
      enhed: r.enhed,
      beskrivelse: r.beskrivelse,
    })),
  );

  function opdater(i: number, felt: Partial<EffektRow>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...felt } : r)));
  }

  function vaelgKategori(i: number, kategori: string) {
    setRows((prev) =>
      prev.map((r, j) => {
        if (j !== i) return r;
        const std = standardEnhedFor(kategori);
        return { ...r, kategori, enhed: r.enhed.trim() === '' ? std : r.enhed };
      }),
    );
  }

  function tilFritekst(i: number) {
    opdater(i, { kategori: null, vaerdi: '', enhed: '' });
  }
  function tilStruktureret(i: number) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, kategori: 'co2_reduktion', enhed: standardEnhedFor('co2_reduktion'), beskrivelse: '' } : r)));
  }

  function tilfoej() {
    setRows((prev) => [...prev, { ...TOM_STRUKTURERET }]);
  }
  function fjern(i: number) {
    setRows((prev) => (prev.length === 1 ? [{ ...TOM_STRUKTURERET }] : prev.filter((_, j) => j !== i)));
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">Forventede effekter</label>
      <input type="hidden" name="effekter" value={serialiseret} />
      <div className="flex flex-col gap-3 rounded-md border border-gray-300 p-3">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-col gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
            {r.kategori !== null ? (
              <>
                <div className="flex items-center gap-2">
                  <select
                    value={r.kategori}
                    onChange={(e) => vaelgKategori(i, e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {EFFEKT_KATEGORIER.map((k) => (
                      <option key={k.key} value={k.key}>{k.navn}</option>
                    ))}
                  </select>
                  <input
                    type="number" step="0.1" inputMode="decimal" placeholder="Værdi"
                    value={r.vaerdi}
                    onChange={(e) => opdater(i, { vaerdi: e.target.value })}
                    className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="text" placeholder="Enhed"
                    value={r.enhed}
                    onChange={(e) => opdater(i, { enhed: e.target.value })}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <button type="button" onClick={() => fjern(i)} className="px-2 text-gray-400 hover:text-red-600" aria-label="Fjern effekt">×</button>
                </div>
                <button type="button" onClick={() => tilFritekst(i)} className="self-start text-xs text-gray-500 hover:text-gray-800">
                  skift til fritekst
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <textarea
                    rows={2} placeholder="Beskriv effekten"
                    value={r.beskrivelse}
                    onChange={(e) => opdater(i, { beskrivelse: e.target.value })}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <button type="button" onClick={() => fjern(i)} className="px-2 text-gray-400 hover:text-red-600" aria-label="Fjern effekt">×</button>
                </div>
                <button type="button" onClick={() => tilStruktureret(i)} className="self-start text-xs text-gray-500 hover:text-gray-800">
                  skift til struktureret (kategori, værdi, enhed)
                </button>
              </>
            )}
          </div>
        ))}
        <button type="button" onClick={tilfoej} className="self-start rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
          + Tilføj effekt
        </button>
      </div>
    </div>
  );
}
