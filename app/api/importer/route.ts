import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const maxDuration = 60;

const MAX_FILE_MB = 15;
const MAX_TEXT_CHARS = 80_000;

const SYSTEM_PROMPT = `Du er assistent til klimakoordinatorer i danske kommuner.
Analyser det uploadede handlingskatalog og udtræk kommunens klimaindsatser og -handlinger.

Returner KUN et JSON-objekt — ingen forklarende tekst, ingen markdown-blokke. Strukturen:
{
  "indsatsomraader": [
    {
      "navn": "Navn på indsatsområde (kortfattet, maks 60 tegn)",
      "type": "ghg_reduction" | "adaptation" | "consumption" | "just_transition" | "cross_cutting",
      "sektor": "energy" | "transport" | "buildings" | "food" | "agriculture" | "waste" | "adaptation" | "other",
      "beskrivelse": "Kort beskrivelse af indsatsområdet (valgfri)",
      "handlinger": [
        {
          "titel": "Handelstitlen (kortfattet, maks 80 tegn)",
          "type": "reduction" | "adaptation" | "both",
          "status": "planned" | "in_progress" | "completed" | "discontinued",
          "beskrivelse": "Evt. kort beskrivelse"
        }
      ]
    }
  ]
}

Vurderingskriterier:
- ghg_reduction: CO₂-/drivhusgasreduktion
- adaptation: klimatilpasning, oversvømmelse, tørke, varme
- consumption: forbrugsmønstre, indkøb
- just_transition: retfærdig omstilling, social
- cross_cutting: tværgående, gælder flere sektorer

Returner KUN gyldigt JSON.`;

export async function POST(req: NextRequest) {
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
  const allowedExt = ['pdf', 'csv', 'xlsx', 'xls', 'docx'];
  if (!allowedExt.includes(ext)) {
    return NextResponse.json({ error: `Filtype .${ext} understøttes ikke` }, { status: 400 });
  }

  let textContent: string;

  try {
    if (ext === 'csv') {
      textContent = await file.text();
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const rows: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        rows.push(`\n=== Ark: ${sheetName} ===`);
        rows.push(XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]));
      }
      textContent = rows.join('\n');
    } else if (ext === 'docx') {
      const mammoth = await import('mammoth');
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      textContent = result.value;
    } else {
      // PDF: extract text with pdf-parse
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = await file.arrayBuffer();
      const result = await pdfParse(Buffer.from(buffer));
      textContent = result.text;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Kunne ikke læse filen: ${msg}` }, { status: 400 });
  }

  if (!textContent.trim()) {
    return NextResponse.json({ error: 'Filen ser ud til at være tom eller kan ikke læses (fx scanned PDF uden tekstlag)' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Udtræk alle indsatsområder og handlinger fra dette handlingskatalog:\n\n${textContent.slice(0, MAX_TEXT_CHARS)}`,
        }],
      },
      { timeout: 45_000 },
    );

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: 'AI returnerede ikke gyldigt JSON — prøv igen', raw }, { status: 500 });
    }

    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return NextResponse.json({ error: 'AI-analysen tog for lang tid. Prøv med en mindre fil eller færre handlinger.' }, { status: 504 });
    }
    return NextResponse.json({ error: `AI-fejl: ${msg}` }, { status: 500 });
  }
}
