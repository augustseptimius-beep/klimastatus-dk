import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { getImportJob } from '@/db/queries/import-job';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await verifySession();
  if (!session?.kommuneId) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const { jobId } = await params;
  const job = await getImportJob(jobId);

  if (!job || job.kommuneId !== session.kommuneId) {
    return NextResponse.json({ error: 'Job ikke fundet' }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    resultat: job.resultat ?? null,
    fejl: job.fejl ?? null,
  });
}
