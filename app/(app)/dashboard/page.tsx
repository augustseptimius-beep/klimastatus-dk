import { verifySession } from '@/lib/dal';
import { getKommuneById, getAllTovholdere, getAllTiltag, getAllIndsatsOmraader } from '@/db/queries';
import { getLatestRapporterForTovholder } from '@/db/queries/rapport';
import { getCctfDaekning } from '@/db/queries/cctf';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { kommuneIndikator, indikatorTemplate, indikatorMaaling } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CctfDashboardWidget } from '@/components/cctf/cctf-dashboard-widget';

export const metadata = { title: 'Dashboard — Klimastatus.dk' };

export default async function DashboardPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const [kommune, tovholdere, tiltag, indsatser] = await Promise.all([
    getKommuneById(session.kommuneId),
    getAllTovholdere(session.kommuneId),
    getAllTiltag(session.kommuneId),
    getAllIndsatsOmraader(session.kommuneId),
  ]);
  if (!kommune) redirect('/login');

  const co2eKI = await db
    .select({ indikatorId: kommuneIndikator.indikatorId })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(
      eq(kommuneIndikator.kommuneId, session.kommuneId),
      eq(kommuneIndikator.aktiv, true),
      eq(indikatorTemplate.kilde, 'klimaregnskab'),
    ))
    .limit(1);

  const veKI = await db
    .select({ indikatorId: kommuneIndikator.indikatorId })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(
      eq(kommuneIndikator.kommuneId, session.kommuneId),
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
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rapporter = await Promise.all(
    aktiveTovholdere.map((t) => getLatestRapporterForTovholder(t.id)),
  );
  const harSvaret = rapporter.filter(
    (rs) => rs.some((r) => new Date(r.createdAt) > cutoff),
  ).length;

  const cctfDaekning = await getCctfDaekning(session.kommuneId);

  const statCols = 2 + (co2eKI.length > 0 ? 1 : 0) + (veKI.length > 0 ? 1 : 0) + 1; // +1 for CCTF

  return (
    <>
      <div className="ks-page-header">
        <div>
          <div className="eyebrow">Klimastatus 2025</div>
          <h1>{kommune.navn} Kommune</h1>
        </div>
      </div>

      {/* Stat grid */}
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
        <CctfDashboardWidget daekning={cctfDaekning} />
      </div>

      {/* Quick links */}
      <div className="ks-section">
        <div className="ks-section-head">
          <div>
            <div className="eyebrow">Overblik</div>
            <h2>Genveje</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <QuickLink href="/indsatser"  label="Indsatsområder"   count={indsatser.length} />
          <QuickLink href="/tiltag"     label="Handlingsoverblik" count={aktiveTiltag.length} />
          <QuickLink href="/tovholdere" label="Tovholdere"        count={aktiveTovholdere.length} />
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
