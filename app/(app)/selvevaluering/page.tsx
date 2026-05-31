import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { getCctfKriterier, getCctfDaekning } from '@/db/queries/cctf';
import {
  getSelvevaluering,
  getDokumentationshenvisninger,
  initialiserKriterieData,
} from '@/db/queries/selvevaluering';
import { KriterieEditor } from '@/components/cctf/kriterie-editor';
import { genererSelvevaluering, genererSelvevalueringFormAction } from './actions';
import type { KriterieBesvarelse } from '@/lib/cctf/selvevaluering-types';
import Link from 'next/link';

export const metadata = { title: 'Selvevaluering — Klimastatus.dk' };

const KOMPONENT_FARVER: Record<string, string> = {
  'Forpligtelse, styring og mainstreaming': '#ec624e',
  'Inkluderende inddragelse og kommunikation': '#8d77c8',
  'Viden som grundlag for mål, strategier og handlinger': '#43ad47',
  'Mål for hele kommunen, understøttet af sektorstrategier': '#3a7abf',
  'Handlinger og implementeringsplanlægning baseret på vidensgrundlaget': '#e07b39',
  'Monitorering, evaluering og rapportering af fremdrift med fokus på læring': '#4ab8b8',
};

export default async function SelvevalueringPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [kriterier, daekning, saved] = await Promise.all([
    getCctfKriterier(),
    getCctfDaekning(session.kommuneId),
    getSelvevaluering(session.kommuneId),
  ]);

  const data = saved?.kriterieData ?? initialiserKriterieData('2.5');
  const daekningByNr = new Map(daekning.map(d => [d.kriterieNr, d]));
  const besvarelseByNr = new Map(data.kriterier.map(k => [k.kriterieNr, k]));

  const liveDokRefsAll = await Promise.all(
    kriterier.map(k => getDokumentationshenvisninger(session.kommuneId!, k.kriterieNr))
  );
  const liveDokRefsByNr = new Map(
    kriterier.map((k, i) => [k.kriterieNr, liveDokRefsAll[i]])
  );

  const godkendte = data.kriterier.filter(k => k.status === 'godkendt').length;
  const komponenter = [...new Map(kriterier.map(k => [k.komponent, true])).keys()];

  return (
    <div style={{ padding: '32px 40px', maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Selvevaluering</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-500)' }}>
            CCTF v2.5 — {godkendte}/16 kriterier godkendt
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <form action={genererSelvevalueringFormAction}>
            <button type="submit" style={{
              padding: '8px 16px', borderRadius: 4,
              border: '1px solid var(--sand-300)',
              background: 'white', fontSize: 13, cursor: 'pointer',
              color: 'var(--ink-700)',
            }}>
              {saved ? 'Opdatér dokumentation' : 'Generér skema'}
            </button>
          </form>
          <Link href="/selvevaluering/preview" style={{
            padding: '8px 16px', borderRadius: 4,
            background: '#1E6B3A', color: 'white',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
          }}>
            Eksportér / Udskriv →
          </Link>
        </div>
      </div>

      {!saved && (
        <div style={{
          padding: '16px 20px',
          background: '#fff8e1',
          border: '1px solid #f59e0b',
          borderRadius: 8,
          fontSize: 14,
          color: '#8B6914',
          marginBottom: 32,
        }}>
          Klik "Generér skema" for at oprette selvevalueringen og auto-udfylde dokumentationshenvisninger.
        </div>
      )}

      {komponenter.map(komponent => {
        const ks = kriterier.filter(k => k.komponent === komponent);
        const farve = KOMPONENT_FARVER[komponent] ?? '#888';
        return (
          <section key={komponent} style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 12, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.07em',
              color: farve, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: farve }} />
              {komponent}
            </h2>
            <div style={{
              background: 'white',
              border: '1px solid var(--sand-300)',
              borderRadius: 8,
              padding: '0 24px',
            }}>
              {ks.map(k => {
                const fallbackBesvarelse: KriterieBesvarelse = {
                  kriterieNr: k.kriterieNr,
                  status: 'tom',
                  hvadStaarPaa: '', hvadOpdateres: '', selvvurdering: '',
                  dokumentationshenvisninger: [],
                  aiGenereret: false, aiGenereretDato: null,
                };
                return (
                  <KriterieEditor
                    key={k.id}
                    kriterie={k}
                    besvarelse={besvarelseByNr.get(k.kriterieNr) ?? fallbackBesvarelse}
                    daekning={daekningByNr.get(k.kriterieNr) ?? { kriterieNr: k.kriterieNr, status: 'afventer', checks: [] }}
                    liveDokRefs={liveDokRefsByNr.get(k.kriterieNr) ?? []}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
