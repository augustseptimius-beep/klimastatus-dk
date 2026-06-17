import { requireKommuneContext } from '@/lib/kommune-context';
import { getActiveTemplates } from '@/db/queries/indikator-template';
import { db } from '@/db';
import { kommuneIndikator, indikatorTemplate, indikatorMaaling } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import Link from 'next/link';
import { activateTemplateFormAction, deactivateKommuneIndikatorAction } from './actions';
import { HentNuKnap } from './_hent-nu-knap';
import { getForaeldreloeseIndikatorer } from '@/db/queries/beslutningsport';
import { getIndikatorKobling } from '@/db/queries/indikator-kobling';
import { getAllTiltag } from '@/db/queries';
import { KoblingPanel } from './_kobling-panel';

export const metadata = { title: 'Data — Klimastatus.dk' };

const KILDE_LABEL: Record<string, string> = {
  klimaregnskab: 'Klimaregnskabet.dk',
  energidataservice: 'Energi Data Service',
  dst: 'Danmarks Statistik',
};

function StalenessStatus({ sidstHentet, sidsteFejl, sidsteFejlBesked }: {
  sidstHentet: Date | null;
  sidsteFejl: Date | null;
  sidsteFejlBesked: string | null;
}) {
  if (sidsteFejl && (!sidstHentet || sidsteFejl > sidstHentet)) {
    return (
      <div>
        <span className="text-xs font-medium text-red-600">⚠ Fejl ved hentning</span>
        {sidsteFejlBesked && (
          <div className="mt-1 max-w-xs rounded bg-red-50 px-2 py-1 text-xs text-red-700 break-words">
            {sidsteFejlBesked}
          </div>
        )}
      </div>
    );
  }
  if (!sidstHentet) {
    return <span className="text-xs text-gray-400">Afventer første hentning</span>;
  }
  // eslint-disable-next-line react-hooks/purity
  const daysSince = Math.floor((Date.now() - new Date(sidstHentet).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince > 35) {
    return <span className="text-xs text-yellow-600">⚠ Senest hentet: {daysSince} dage siden</span>;
  }
  return <span className="text-xs text-green-600">Hentet {new Date(sidstHentet).toLocaleDateString('da-DK')}</span>;
}

type Props = {
  params: Promise<{ kommune: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function DataPage({ params, searchParams }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const { tab } = await searchParams;
  const activeTab = tab === 'katalog' ? 'katalog' : 'aktive';

  const aktiveKI = await db
    .select({
      id: kommuneIndikator.id,
      visningsnavn: kommuneIndikator.visningsnavn,
      sidstHentet: kommuneIndikator.sidstHentet,
      sidsteFejl: kommuneIndikator.sidsteFejl,
      sidsteFejlBesked: kommuneIndikator.sidsteFejlBesked,
      templateId: kommuneIndikator.templateId,
      indikatorId: kommuneIndikator.indikatorId,
      titel: indikatorTemplate.titel,
      kilde: indikatorTemplate.kilde,
      enhed: indikatorTemplate.enhed,
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(eq(kommuneIndikator.kommuneId, kommune.id), eq(kommuneIndikator.aktiv, true)));

  const aktiveWithValue = await Promise.all(
    aktiveKI.map(async (ki) => {
      const [latest] = await db
        .select({ vaerdi: indikatorMaaling.vaerdi, aar: indikatorMaaling.aar })
        .from(indikatorMaaling)
        .where(eq(indikatorMaaling.indikatorId, ki.indikatorId))
        .orderBy(desc(indikatorMaaling.aar))
        .limit(1);
      return { ...ki, latest };
    }),
  );

  const foraeldreloese = await getForaeldreloeseIndikatorer(kommune.id);

  const allTemplates = await getActiveTemplates();
  const aktiveredeTemplateIds = new Set(aktiveKI.map((ki) => ki.templateId));

  const alleTiltag = await getAllTiltag(kommune.id);
  const koblinger = await Promise.all(
    aktiveWithValue.map(async (ki) => ({
      kommuneIndikatorId: ki.id,
      ...(await getIndikatorKobling(ki.indikatorId)),
    }))
  );

  return (
    <div>
      {foraeldreloese.length > 0 && (
        <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <strong>{foraeldreloese.length} indikator{foraeldreloese.length === 1 ? '' : 'er'} uden kobling.</strong>{' '}
          Følgende aktive indikatorer er hverken knyttet til et mål eller et prioriteret tiltag og tæller ikke i CCTF-kriterie 15:
          <ul className="mt-1 list-disc pl-5">
            {foraeldreloese.map((f) => <li key={f.kommuneIndikatorId}>{f.titel}</li>)}
          </ul>
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Data</h1>
      </div>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        <Link
          href={`/k/${slug}/data?tab=aktive`}
          className={`px-4 pb-2 text-sm font-medium ${activeTab === 'aktive' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Aktive indikatorer ({aktiveWithValue.length})
        </Link>
        <Link
          href={`/k/${slug}/data?tab=katalog`}
          className={`px-4 pb-2 text-sm font-medium ${activeTab === 'katalog' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Tilføj indikator
        </Link>
      </div>

      {activeTab === 'aktive' && (
        <div>
          {aktiveWithValue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500">
              Ingen aktive indikatorer.{' '}
              <Link href={`/k/${slug}/data?tab=katalog`} className="text-gray-700 underline">
                Tilføj fra kataloget.
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Indikator</th>
                    <th className="px-4 py-3 font-medium">Seneste</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Handlinger</th>
                    <th className="px-4 py-3 font-medium">Koblinger</th>
                  </tr>
                </thead>
                <tbody>
                  {aktiveWithValue.map((ki) => (
                    <tr key={ki.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{ki.visningsnavn ?? ki.titel}</p>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          {ki.kilde ? (KILDE_LABEL[ki.kilde] ?? ki.kilde) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ki.latest ? `${ki.latest.vaerdi} ${ki.enhed} (${ki.latest.aar})` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StalenessStatus
                          sidstHentet={ki.sidstHentet}
                          sidsteFejl={ki.sidsteFejl}
                          sidsteFejlBesked={ki.sidsteFejlBesked}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <HentNuKnap slug={slug} kommuneIndikatorId={ki.id} />
                          <form action={deactivateKommuneIndikatorAction.bind(null, slug, ki.id)}>
                            <button type="submit"
                              className="rounded-md px-3 py-1 text-xs font-medium text-gray-400 hover:text-red-600">
                              Deaktiver
                            </button>
                          </form>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top" style={{ minWidth: 220 }}>
                        {(() => {
                          const kb = koblinger.find((k) => k.kommuneIndikatorId === ki.id);
                          if (!kb) return null;
                          return (
                            <KoblingPanel
                              slug={slug}
                              kommuneIndikatorId={ki.id}
                              tilknyttedeTiltag={kb.tilknyttedeTiltag}
                              alleTiltag={alleTiltag}
                            />
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'katalog' && (
        <div>
          {(['klimaregnskab', 'energidataservice', 'dst'] as const).map((kilde) => {
            const kildeTemplates = allTemplates.filter((t) => t.kilde === kilde);
            if (kildeTemplates.length === 0) return null;
            return (
              <div key={kilde} className="mb-8">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {KILDE_LABEL[kilde]}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {kildeTemplates.map((t) => {
                    const erAktiv = aktiveredeTemplateIds.has(t.id);
                    return (
                      <div key={t.id}
                        className={`rounded-xl border p-4 ${erAktiv ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}>
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-900">{t.titel}</p>
                          {erAktiv && (
                            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Aktiv</span>
                          )}
                        </div>
                        <p className="mb-2 text-xs text-gray-500">{t.beskrivelse}</p>
                        <p className="mb-3 text-xs text-gray-400">
                          Enhed: {t.enhed}
                          {t.cctfKriterier.length > 0 && ` · CCTF: ${t.cctfKriterier.join(', ')}`}
                        </p>
                        {!erAktiv && (
                          <form action={activateTemplateFormAction.bind(null, slug)}>
                            <input type="hidden" name="templateId" value={t.id} />
                            <button type="submit"
                              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700">
                              Aktivér
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {allTemplates.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              Ingen indikatorer i kataloget endnu. Admin tilføjer indikatorer under /admin/indikatorer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
