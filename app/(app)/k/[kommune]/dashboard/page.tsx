import { requireKommuneContext } from '@/lib/kommune-context';
import { getAllTovholdere, getAllTiltag, getAllIndsatsOmraader } from '@/db/queries';
import { getEffektKomplethed } from '@/db/queries/tiltag';
import { getUfuldstaendigeReduktionsMaal } from '@/db/queries/maal';
import { getLatestRapporterForTovholder } from '@/db/queries/rapport';
import { getCctfDaekning } from '@/db/queries/cctf';
import Link from 'next/link';
import { db } from '@/db';
import { kommuneIndikator, indikatorTemplate, indikatorMaaling } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CctfDashboardWidget } from '@/components/cctf/cctf-dashboard-widget';

export const metadata = { title: 'Dashboard — Klimastatus.dk' };

type Props = { params: Promise<{ kommune: string }> };

export default async function DashboardPage({ params }: Props) {
  const { kommune: slug } = await params;
  const { kommune } = await requireKommuneContext(slug);

  const [tovholdere, tiltag, indsatser, effektKomplethed, ufuldstaendigeMaal] = await Promise.all([
    getAllTovholdere(kommune.id),
    getAllTiltag(kommune.id),
    getAllIndsatsOmraader(kommune.id),
    getEffektKomplethed(kommune.id),
    getUfuldstaendigeReduktionsMaal(kommune.id),
  ]);

  const co2eKI = await db
    .select({ indikatorId: kommuneIndikator.indikatorId })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(
      eq(kommuneIndikator.kommuneId, kommune.id),
      eq(kommuneIndikator.aktiv, true),
      eq(indikatorTemplate.kilde, 'klimaregnskab'),
    ))
    .limit(1);

  const veKI = await db
    .select({ indikatorId: kommuneIndikator.indikatorId })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(
      eq(kommuneIndikator.kommuneId, kommune.id),
      eq(kommuneIndikator.aktiv, true),
      eq(indikatorTemplate.kilde, 'energidataservice'),
    ))
    .limit(1);

  const [co2eSeneste, veMWSeneste] = await Promise.all([
    co2eKI[0]
      ? db.select({ vaerdi: indikatorMaaling.vaerdi, aar: indikatorMaaling.aar })
          .from(indikatorMaaling)
          .where(eq(indikatorMaaling.indikatorId, co2eKI[0].indikatorId))
          .orderBy(desc(indikatorMaaling.aar))
          .limit(1)
      : Promise.resolve([]),
    veKI[0]
      ? db.select({ vaerdi: indikatorMaaling.vaerdi, aar: indikatorMaaling.aar })
          .from(indikatorMaaling)
          .where(eq(indikatorMaaling.indikatorId, veKI[0].indikatorId))
          .orderBy(desc(indikatorMaaling.aar))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const aktiveTiltag = tiltag.filter((t) => t.status !== 'discontinued');
  const igangvaerende = tiltag.filter((t) => t.status === 'in_progress').length;
  const aktiveTovholdere = tovholdere.filter((t) => t.aktiv);
  // eslint-disable-next-line react-hooks/purity
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rapporter = await Promise.all(
    aktiveTovholdere.map((t) => getLatestRapporterForTovholder(t.id)),
  );
  const harSvaret = rapporter.filter(
    (rs) => rs.some((r) => new Date(r.createdAt) > cutoff),
  ).length;

  const cctfDaekning = await getCctfDaekning(kommune.id);

  const statCols = 2 + (co2eKI.length > 0 ? 1 : 0) + (veKI.length > 0 ? 1 : 0) + 1;

  return (
    <>
      <div className="ks-page-header">
        <div>
          <div className="eyebrow">Klimastatus 2025</div>
          <h1>{kommune.navn} Kommune</h1>
        </div>
        <div className="actions">
          <Link href={`/k/${slug}/statusnotat`} className="ks-btn ks-btn-primary">
            Generér statusnotat
          </Link>
        </div>
      </div>

      <div className="ks-stat-grid" style={{ gridTemplateColumns: `repeat(${statCols}, 1fr)` }}>
        <div className="ks-stat">
          <div className="label">Handlinger igangværende</div>
          <div className="num">
            <em>{igangvaerende}</em>/{aktiveTiltag.length}
          </div>
        </div>
        <div className="ks-stat">
          <div className="label">Tovholdere rapporteret (30 dage)</div>
          <div className="num">
            {aktiveTovholdere.length === 0
              ? <span style={{ fontSize: 24, color: 'var(--ink-400)' }}>Ingen</span>
              : <><em>{harSvaret}</em>/{aktiveTovholdere.length}</>}
          </div>
        </div>
        {co2eKI.length > 0 && (
          <div className="ks-stat">
            <div className="label">CO₂e pr. capita</div>
            <div className="num">
              {co2eSeneste[0]
                ? <><em>{co2eSeneste[0].vaerdi}</em> <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-500)' }}>t ({co2eSeneste[0].aar})</span></>
                : <span style={{ fontSize: 20, color: 'var(--ink-400)' }}>Ingen data</span>}
            </div>
          </div>
        )}
        {veKI.length > 0 && (
          <div className="ks-stat">
            <div className="label">VE-kapacitet vind + sol</div>
            <div className="num">
              {veMWSeneste[0]
                ? <><em>{Math.round(veMWSeneste[0].vaerdi)}</em> <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-500)' }}>MW ({veMWSeneste[0].aar})</span></>
                : <span style={{ fontSize: 20, color: 'var(--ink-400)' }}>Ingen data</span>}
            </div>
          </div>
        )}
        <CctfDashboardWidget daekning={cctfDaekning} slug={slug} />
      </div>

      {(effektKomplethed.tiltagUdenEffekt > 0 || ufuldstaendigeMaal.length > 0) && (
        <div className="ks-card" style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 6 }}>
            Datagrundlaget er ufuldstændigt — tallene herover undervurderer klimaplanen
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#92400e', lineHeight: 1.7 }}>
            {effektKomplethed.tiltagUdenEffekt > 0 && (
              <li>
                Effekt-skøn mangler på{' '}
                <strong>{effektKomplethed.tiltagUdenEffekt} af {effektKomplethed.aktiveTiltag} handlinger</strong>
                {' '}— deres CO₂-effekt tæller som 0 i alle summer.{' '}
                <Link href={`/k/${slug}/tiltag`} style={{ color: '#92400e', fontWeight: 600 }}>Gennemgå handlinger →</Link>
              </li>
            )}
            {ufuldstaendigeMaal.length > 0 && (
              <li>
                <strong>{ufuldstaendigeMaal.length} reduktionsmål</strong> mangler{' '}
                {[...new Set(ufuldstaendigeMaal.flatMap((m) => m.mangler))].join(', ')}
                {' '}og vises derfor ikke på grafer.{' '}
                <Link href={`/k/${slug}/indsatser`} style={{ color: '#92400e', fontWeight: 600 }}>Redigér mål →</Link>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="ks-section">
        <div className="ks-section-head">
          <div>
            <div className="eyebrow">Overblik</div>
            <h2>Genveje</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <QuickLink href={`/k/${slug}/indsatser`}  label="Indsatsområder"    count={indsatser.length} />
          <QuickLink href={`/k/${slug}/tiltag`}     label="Handlingsoverblik" count={aktiveTiltag.length} />
          <QuickLink href={`/k/${slug}/tovholdere`} label="Tovholdere"        count={aktiveTovholdere.length} />
        </div>
      </div>
    </>
  );
}

function QuickLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="ks-card" style={{ cursor: 'pointer', transition: 'border-color 120ms ease' }}
        onMouseEnter={undefined}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--forest-900)', marginBottom: 12 }}>
          {label}
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink-900)', fontVariantNumeric: 'tabular-nums' }}>
          {count}
        </div>
      </div>
    </Link>
  );
}
