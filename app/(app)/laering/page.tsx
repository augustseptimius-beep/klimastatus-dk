import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { tiltag, maal, indsatsOmraade } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLaeringsposter, getBarriereInbox } from '@/db/queries/laeringspost';
import { beslutningLabel, knytningLabel } from '@/lib/merl/laeringspost-types';
import type { LaeringsBeslutning, LaeringsKnytning } from '@/lib/merl/laeringspost-types';
import { LaeringspostForm } from './_laeringspost-form';
import { BarriereKort } from './_barriere-kort';
import { SletKnap } from './_slet-knap';

export const metadata = { title: 'Læring — Klimastatus.dk' };

export default async function LaeringPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');
  const kommuneId = session.kommuneId as string;

  const [laeringsposter, barriereInbox, tiltagRows, maalRows, ioRows] = await Promise.all([
    getLaeringsposter(kommuneId),
    getBarriereInbox(kommuneId),
    db.select({ id: tiltag.id, titel: tiltag.titel }).from(tiltag).where(eq(tiltag.kommuneId, kommuneId)),
    db.select({ id: maal.id, beskrivelse: maal.beskrivelse })
      .from(maal)
      .innerJoin(indsatsOmraade, eq(maal.indsatsOmraadeId, indsatsOmraade.id))
      .where(eq(indsatsOmraade.kommuneId, kommuneId)),
    db.select({ id: indsatsOmraade.id, navn: indsatsOmraade.navn })
      .from(indsatsOmraade).where(eq(indsatsOmraade.kommuneId, kommuneId)),
  ]);

  const tiltagValg = tiltagRows.map((t) => ({ id: t.id, label: t.titel }));
  const maalValg = maalRows.map((m) => ({ id: m.id, label: m.beskrivelse.slice(0, 80) }));
  const indsatsomraadeValg = ioRows.map((io) => ({ id: io.id, label: io.navn }));
  const tiltagTitelById = new Map(tiltagValg.map((t) => [t.id, t.label]));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Læring</h1>
        <p className="text-sm text-gray-500">
          Omsæt observationer fra monitoreringen til dokumenterede beslutninger (CCTF-kriterie 15).
        </p>
      </div>

      {/* Barriere-indbakke */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Barrierer der venter på en beslutning ({barriereInbox.length})
        </h2>
        {barriereInbox.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-400">
            Ingen ubehandlede barrierer fra tovholdere.
          </p>
        ) : (
          <div className="space-y-3">
            {barriereInbox.map((b) => (
              <BarriereKort
                key={b.rapportId}
                barriere={b}
                tiltagValg={tiltagValg}
                maalValg={maalValg}
                indsatsomraadeValg={indsatsomraadeValg}
              />
            ))}
          </div>
        )}
      </section>

      {/* Fritstående oprettelse */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Ny læringspost</h2>
        <LaeringspostForm
          tiltagValg={tiltagValg}
          maalValg={maalValg}
          indsatsomraadeValg={indsatsomraadeValg}
        />
      </section>

      {/* Liste */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Læringsposter ({laeringsposter.length})</h2>
        {laeringsposter.length === 0 ? (
          <p className="text-sm text-gray-500">Ingen læringsposter endnu.</p>
        ) : (
          <div className="divide-y rounded-xl border border-gray-200">
            {laeringsposter.map((lp) => {
              const knytLabel = lp.knyttetTilType === 'tiltag'
                ? (tiltagTitelById.get(lp.knyttetTilId) ?? 'Tiltag')
                : knytningLabel(lp.knyttetTilType as LaeringsKnytning);
              return (
                <div key={lp.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lp.observation}</p>
                      {lp.fortolkning && <p className="mt-0.5 text-xs text-gray-500">{lp.fortolkning}</p>}
                      <p className="mt-1 text-xs text-gray-400">
                        {knytLabel} · {lp.dato}{lp.beslutningstager ? ` · ${lp.beslutningstager}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {beslutningLabel(lp.beslutning as LaeringsBeslutning)}
                      </span>
                      <SletKnap id={lp.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
