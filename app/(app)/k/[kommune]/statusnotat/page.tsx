import { requireKommuneContext } from '@/lib/kommune-context';
import { hentStatusnotatData, type StatusFordeling } from '@/lib/rapport/statusnotat';
import { PrintButton } from '@/components/print-button';
import Link from 'next/link';

export const metadata = { title: 'Statusnotat — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

const datoFormat = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
const talFormat = new Intl.NumberFormat('da-DK');

function fordelingTekst(f: StatusFordeling): string {
  const dele: string[] = [];
  if (f.completed > 0) dele.push(`${f.completed} gennemført`);
  if (f.in_progress > 0) dele.push(`${f.in_progress} i gang`);
  if (f.planned > 0) dele.push(`${f.planned} planlagt`);
  if (f.discontinued > 0) dele.push(`${f.discontinued} udgået`);
  return dele.length > 0 ? dele.join(' · ') : 'ingen handlinger';
}

export default async function StatusnotatPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const data = await hentStatusnotatData(kommune.id);
  const { totaler, tovholderRunde } = data;

  return (
    <>
      <style>{`
        .notat { max-width: 860px; background: white; border: 1px solid var(--sand-300); border-radius: 8px; padding: 40px 48px; }
        .notat h1 { font-size: 26px; margin: 0 0 4px; }
        .notat h2 { font-size: 16px; margin: 28px 0 10px; color: var(--forest-900, #1E6B3A); }
        .notat table { border-collapse: collapse; width: 100%; }
        .notat th, .notat td { border: 1px solid #ccc; padding: 8px 10px; font-size: 13px; text-align: left; vertical-align: top; }
        .notat th { background: #f5f0e8; font-size: 12px; }
        .notat .meta { color: var(--ink-500, #6B6B63); font-size: 13px; margin-bottom: 20px; }
        .notat .fodnote { font-size: 12px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 8px 12px; margin-top: 8px; }
        .notat ul { margin: 6px 0; padding-left: 20px; }
        .notat li { font-size: 13px; line-height: 1.6; margin-bottom: 6px; }
        @media print {
          .notat { border: none; border-radius: 0; padding: 0; max-width: none; }
          body { font-size: 11pt; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        <PrintButton />
        <a href={`/k/${slug}/statusnotat/docx`} className="ks-btn ks-btn-secondary">
          Hent som Word (.docx)
        </a>
        <Link href={`/k/${slug}/dashboard`} className="ks-btn ks-btn-secondary" style={{ marginLeft: 'auto' }}>
          ← Tilbage
        </Link>
      </div>

      <div className="notat">
        <h1>Statusnotat — klimahandlingsplan</h1>
        <div className="meta">
          {kommune.navn} Kommune · genereret {datoFormat.format(data.genereret)}
        </div>

        <h2>Overblik</h2>
        <ul>
          <li>
            <strong>{totaler.fordeling.in_progress}</strong> af <strong>{totaler.antalAktive}</strong> aktive
            handlinger er i gang ({fordelingTekst(totaler.fordeling)}).
          </li>
          <li>
            Forventet samlet CO₂-reduktion fra handlingerne:{' '}
            <strong>{talFormat.format(Math.round(totaler.co2SumTon))} ton CO₂e</strong>
            {totaler.tiltagUdenEffekt > 0 && ' (undervurderet — se datagrundlag)'}
            .
          </li>
          {data.reduktionsMaal && (
            <li>
              Reduktionsmål: fra {talFormat.format(data.reduktionsMaal.baselineVaerdi)}{' '}
              ({data.reduktionsMaal.baselineAar}) til {talFormat.format(data.reduktionsMaal.maalVaerdi)}{' '}
              {data.reduktionsMaal.enhed ?? ''} i {data.reduktionsMaal.maalAar}.
            </li>
          )}
          <li>
            Tovholder-status: <strong>{tovholderRunde.harSvaret} af {tovholderRunde.aktive}</strong>{' '}
            tovholdere har rapporteret inden for de seneste 30 dage.
          </li>
        </ul>

        <h2>Fremdrift pr. indsatsområde</h2>
        {data.indsatser.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-500)' }}>Ingen indsatsområder endnu.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Indsatsområde</th>
                <th style={{ width: 230 }}>Handlinger</th>
                <th style={{ width: 140 }}>Forventet CO₂-effekt</th>
              </tr>
            </thead>
            <tbody>
              {data.indsatser.map((io) => (
                <tr key={io.id}>
                  <td>{io.navn}</td>
                  <td>{fordelingTekst(io.fordeling)}</td>
                  <td>
                    {io.antalAktive === 0
                      ? '—'
                      : io.co2SumTon > 0
                        ? `${talFormat.format(Math.round(io.co2SumTon))} t CO₂e${io.tiltagUdenEffekt > 0 ? ` (${io.tiltagUdenEffekt} uden skøn)` : ''}`
                        : `intet skøn (${io.tiltagUdenEffekt} af ${io.antalAktive} mangler)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data.kpi.length > 0 && (
          <>
            <h2>Nøgletal (automatisk indhentet)</h2>
            <table>
              <thead>
                <tr>
                  <th>Indikator</th>
                  <th style={{ width: 160 }}>Seneste værdi</th>
                  <th style={{ width: 70 }}>År</th>
                </tr>
              </thead>
              <tbody>
                {data.kpi.map((k, i) => (
                  <tr key={i}>
                    <td>{k.titel}</td>
                    <td>{talFormat.format(k.vaerdi)}{k.enhed ? ` ${k.enhed}` : ''}</td>
                    <td>{k.aar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>Barrierer der afventer beslutning ({data.antalBarrierer})</h2>
        {data.barrierer.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-500)' }}>Ingen ubehandlede barrierer fra tovholderne.</p>
        ) : (
          <ul>
            {data.barrierer.map((b) => (
              <li key={b.rapportId}>
                <strong>{b.tiltagTitel}:</strong> {b.barrierer}{' '}
                <span style={{ color: 'var(--ink-500)' }}>({b.dato})</span>
              </li>
            ))}
            {data.antalBarrierer > data.barrierer.length && (
              <li style={{ color: 'var(--ink-500)' }}>
                … og {data.antalBarrierer - data.barrierer.length} flere i læringsoversigten.
              </li>
            )}
          </ul>
        )}

        {data.beslutninger.length > 0 && (
          <>
            <h2>Seneste beslutninger</h2>
            <ul>
              {data.beslutninger.map((b, i) => (
                <li key={i}>
                  <strong>{b.beslutning}:</strong> {b.observation}{' '}
                  <span style={{ color: 'var(--ink-500)' }}>({b.dato})</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2>Datagrundlag</h2>
        {totaler.tiltagUdenEffekt === 0 && data.ufuldstaendigeMaalAntal === 0 ? (
          <p style={{ fontSize: 13 }}>Alle aktive handlinger har effekt-skøn, og alle reduktionsmål er komplette.</p>
        ) : (
          <div className="fodnote">
            {totaler.tiltagUdenEffekt > 0 && (
              <div>
                Effekt-skøn mangler på {totaler.tiltagUdenEffekt} af {totaler.antalAktive} aktive handlinger —
                den samlede CO₂-effekt er derfor undervurderet.
              </div>
            )}
            {data.ufuldstaendigeMaalAntal > 0 && (
              <div>
                {data.ufuldstaendigeMaalAntal} reduktionsmål mangler baseline- eller målværdier og indgår ikke i grafer.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
