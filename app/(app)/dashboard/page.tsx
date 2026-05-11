import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Dashboard — Klimastatus.dk' };

export default async function DashboardPage() {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const kommune = await getKommuneById(session.kommuneId);
  if (!kommune) redirect('/login');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{kommune.navn} Kommune</h1>
        <p className="mt-1 text-sm text-gray-500">Klimastatus-overblik</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatusCard
          title="CCTF-status"
          value="—"
          description="Selvevaluering ikke påbegyndt"
          status="neutral"
        />
        <StatusCard
          title="Tovholdere"
          value="—"
          description="Ingen runde igangsat"
          status="neutral"
        />
        <StatusCard
          title="Seneste data"
          value="—"
          description="Ingen data hentet endnu"
          status="neutral"
        />
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-400">
        Handlingsoverblik og data tilføjes i næste fase.
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  description,
  status,
}: {
  title: string;
  value: string;
  description: string;
  status: 'green' | 'yellow' | 'red' | 'neutral';
}) {
  const colors = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    neutral: 'bg-white border-gray-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[status]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>
    </div>
  );
}
