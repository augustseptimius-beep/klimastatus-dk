import { requireKommuneContext } from '@/lib/kommune-context';
import { getAllIndsatsOmraader } from '@/db/queries';
import Link from 'next/link';

export const metadata = { title: 'Indsatsområder — Klimastatus.dk' };

const TYPE_LABELS: Record<string, string> = {
  ghg_reduction: 'Drivhusgasreduktion',
  adaptation: 'Klimatilpasning',
  consumption: 'Forbrug',
  just_transition: 'Retfærdig omstilling',
  cross_cutting: 'Tværgående',
};
const TYPE_BADGE: Record<string, string> = {
  ghg_reduction: 'ks-badge-success',
  adaptation: 'ks-badge-info',
  consumption: 'ks-badge-warn',
  just_transition: 'ks-badge-neutral',
  cross_cutting: 'ks-badge-neutral',
};
const SEKTOR_LABELS: Record<string, string> = {
  energy: 'Energi', transport: 'Transport', buildings: 'Bygninger',
  food: 'Fødevarer', agriculture: 'Landbrug', waste: 'Affald',
  adaptation: 'Klimatilpasning', other: 'Andet',
};

type Props = { params: Promise<{ kommune: string }> };

export default async function IndsatserPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const indsatser = await getAllIndsatsOmraader(kommune.id);

  return (
    <>
      <div className="ks-page-header">
        <div>
          <div className="eyebrow">Klimaplan</div>
          <h1>Indsatsområder</h1>
        </div>
        <div className="actions">
          <Link href={`/k/${slug}/indsatser/ny`} className="ks-btn ks-btn-primary">+ Nyt indsatsområde</Link>
        </div>
      </div>

      {/* Help text */}
      <div className="ks-card" style={{ marginBottom: 32, background: 'var(--moss-50)', border: '1px solid var(--moss-100)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--forest-900)', marginBottom: 6 }}>Hvad er et indsatsområde?</div>
            <p style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6, margin: 0 }}>
              Et indsatsområde samler beslægtede handlinger under ét tema — f.eks. &ldquo;Energirenovering af kommunale bygninger&rdquo; eller &ldquo;Klimatilpasning af bycentrum&rdquo;. Det svarer til CCTF-begreberne sektorstrategi og handlingsklynge.
            </p>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--forest-900)', marginBottom: 6 }}>Kan jeg oprette egne?</div>
            <p style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6, margin: 0 }}>
              Ja. CCTF stiller ikke krav om specifikke navne. Du navngiver indsatsområderne, som det passer til jeres klimaplan. Det vigtige er, at de dækker jeres handlinger og kan knyttes til CCTF-kriterierne via handlingerne.
            </p>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--forest-900)', marginBottom: 6 }}>Har du allerede et handlingskatalog?</div>
            <p style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6, margin: 0 }}>
              Opret indsatsområderne manuelt og tilføj handlinger under hvert område. Brug beskrivelsesfeltet til at notere, hvilke handlinger der hører til.
            </p>
          </div>
        </div>
      </div>

      {indsatser.length === 0 ? (
        <div className="ks-empty">
          <h3>Ingen indsatsområder endnu</h3>
          <p>Opret dit første indsatsområde manuelt, eller importer et eksisterende handlingskatalog med AI.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href={`/k/${slug}/indsatser/importer`} className="ks-btn ks-btn-secondary">↑ Importer fra fil</Link>
            <Link href={`/k/${slug}/indsatser/ny`} className="ks-btn ks-btn-primary">+ Nyt indsatsområde</Link>
          </div>
        </div>
      ) : (
        <table className="ks-table">
          <thead>
            <tr>
              <th>Navn</th>
              <th>Type</th>
              <th>Sektor</th>
              <th>Ansvarlig forvaltning</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {indsatser.map((io) => (
              <tr key={io.id}>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{io.navn}</span>
                  {io.beskrivelse && (
                    <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>{io.beskrivelse}</div>
                  )}
                </td>
                <td>
                  <span className={`ks-badge ${TYPE_BADGE[io.type]}`}>{TYPE_LABELS[io.type]}</span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                  {SEKTOR_LABELS[io.sektor] ?? io.sektor}
                </td>
                <td style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                  {io.ansvarligForvaltning ?? '—'}
                </td>
                <td>
                  <Link
                    href={`/k/${slug}/indsatser/${io.id}/rediger`}
                    className="ks-btn ks-btn-secondary"
                    style={{ padding: '5px 10px', fontSize: 12 }}
                  >
                    Rediger
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
