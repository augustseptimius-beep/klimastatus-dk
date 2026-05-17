import { verifySession } from '@/lib/dal';
import { getKommuneById, getAllTovholdere, getAllTiltag, getAllIndsatsOmraader } from '@/db/queries';
import { getLatestRapporterForTovholder } from '@/db/queries/rapport';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { kommuneIndikator, indikatorTemplate, indikatorMaaling } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{kommune.navn} Kommune</h1>
        <p className="mt-1 text-sm text-gray-500">Klimastatus-overblik</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatusCard
          title="Handlinger"
          value={`${igangvaerende}/${aktiveTiltag.length}`}
          description="igangværende tiltag"
          status={igangvaerende > 0 ? 'green' : 'neutral'}
        />
        <StatusCard
          title="Tovholdere"
          value={aktiveTovholdere.length === 0 ? '—' : `${harSvaret}/${aktiveTovholdere.length}`}
          description={aktiveTovholdere.length === 0 ? 'Ingen tovholdere' : 'har rapporteret (30 dage)'}
          status={aktiveTovholdere.length === 0 ? 'neutral' : harSvaret === aktiveTovholdere.length ? 'green' : 'yellow'}
        />
        <StatusCard
          title="CCTF-status"
          value="—"
          description="Selvevaluering ikke påbegyndt"
          status="neutral"
        />
        {co2eKI.length > 0 && (
          <StatusCard
            title="CO₂e pr. capita"
            value={co2eSeneste[0] ? `${co2eSeneste[0].vaerdi} t` : '—'}
            description={co2eSeneste[0] ? `ton CO₂e/indb. (${co2eSeneste[0].aar})` : 'Ingen data endnu'}
            status="neutral"
          />
        )}
        {veKI.length > 0 && (
          <StatusCard
            title="VE-kapacitet"
            value={veMWSeneste[0] ? `${Math.round(veMWSeneste[0].vaerdi)} MW` : '—'}
            description={veMWSeneste[0] ? `vind + sol (${veMWSeneste[0].aar})` : 'Ingen data endnu'}
            status="neutral"
          />
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <QuickLink href="/indsatser" label="Indsatsområder" count={indsatser.length} />
        <QuickLink href="/tiltag" label="Handlingsoverblik" count={aktiveTiltag.length} />
        <QuickLink href="/tovholdere" label="Tovholdere" count={aktiveTovholdere.length} />
      </div>
    </div>
  );
}

function StatusCard({ title, value, description, status }: {
  title: string; value: string; description: string;
  status: 'green' | 'yellow' | 'red' | 'neutral';
}) {
  const colors = {
    green: 'bg-green-50 border-green-200', yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200', neutral: 'bg-white border-gray-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[status]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function QuickLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{count}</p>
    </Link>
  );
}
