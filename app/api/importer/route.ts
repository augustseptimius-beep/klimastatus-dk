import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const maxDuration = 60;

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

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const allowedExt = ['pdf', 'csv', 'xlsx', 'xls', 'docx'];
  if (!allowedExt.includes(ext)) {
    return NextResponse.json({ error: `Filtype .${ext} understøttes ikke` }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message: Anthropic.MessageParam;

  if (ext === 'pdf') {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    message = {
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        } as Anthropic.DocumentBlockParam,
        { type: 'text', text: 'Udtræk alle indsatsområder og handlinger fra dette handlingskatalog.' },
      ],
    };
  } else {
    let textContent: string;

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
    } else {
      // docx — dynamic import to avoid bundling mammoth unless needed
      const mammoth = await import('mammoth');
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      textContent = result.value;
    }

    message = {
      role: 'user',
      content: `Udtræk alle indsatsområder og handlinger fra dette handlingskatalog:\n\n${textContent.slice(0, 80_000)}`,
    };
  }

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [message],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    return NextResponse.json({ error: 'AI returnerede ikke gyldigt JSON', raw }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Kunne ikke parse AI-svar', raw }, { status: 500 });
  }
}
