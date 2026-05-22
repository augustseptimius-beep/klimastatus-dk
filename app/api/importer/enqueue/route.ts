import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getBoss } from '@/lib/jobs/boss-client';
import { verifySession } from '@/lib/dal';
import { createImportJob } from '@/db/queries/import-job';

export const maxDuration = 30;

const MAX_FILE_MB = 15;
const MAX_TEXT_CHARS = 60_000;

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session?.kommuneId) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY er ikke konfigureret' }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Ingen fil modtaget' }, { status: 400 });

  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Filen er for stor (maks ${MAX_FILE_MB} MB)` }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!['pdf', 'csv', 'xlsx', 'xls', 'docx'].includes(ext)) {
    return NextResponse.json({ error: `Filtype .${ext} understøttes ikke` }, { status: 400 });
  }

  let filindhold: string;
  try {
    if (ext === 'pdf') {
      const buffer = await file.arrayBuffer();
      filindhold = Buffer.from(buffer).toString('base64');
      if (filindhold.length > 20_000_000) {
        return NextResponse.json({ error: 'PDF er for stor til analyse (maks ~15 MB)' }, { status: 400 });
      }
    } else if (ext === 'csv') {
      filindhold = (await file.text()).slice(0, MAX_TEXT_CHARS);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      filindhold = wb.SheetNames
        .map((n) => `=== ${n} ===\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`)
        .join('\n\n')
        .slice(0, MAX_TEXT_CHARS);
    } else {
      const mammoth = await import('mammoth');
      const buffer = await file.arrayBuffer();
      filindhold = ((await mammoth.extractRawText({ buffer: Buffer.from(buffer) })).value).slice(0, MAX_TEXT_CHARS);
    }
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `Kunne ikke læse filen: ${e instanceof Error ? e.message : e}` },
      { status: 400 },
    );
  }

  if (!filindhold.trim()) {
    return NextResponse.json({ error: 'Filen ser ud til at være tom eller kan ikke læses' }, { status: 400 });
  }

  const job = await createImportJob({
    kommuneId: session.kommuneId,
    filnavn: file.name,
    filtype: ext,
    filindhold,
  });

  const boss = await getBoss();
  await boss.send('import-handlingskatalog', { importJobId: job.id });

  return NextResponse.json({ jobId: job.id });
}
