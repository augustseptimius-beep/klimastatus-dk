import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const maxDuration = 60;

const MAX_FILE_MB = 15;
const MAX_TEXT_CHARS = 60_000;

const SYSTEM_PROMPT = `Du er assistent til klimakoordinatorer i danske kommuner.
Analyser handlingskataloget og udtræk ALLE klimaindsatser og -handlinger.
Kald funktionen gem_handlingskatalog med det fundne indhold.

Vurderingskriterier for type:
- ghg_reduction: CO₂-/drivhusgasreduktion
- adaptation: klimatilpasning, oversvømmelse, tørke, varme
- consumption: forbrugsmønstre, indkøb
- just_transition: retfærdig omstilling, social
- cross_cutting: tværgående, gælder flere sektorer`;

const TOOL: Anthropic.Tool = {
  name: 'gem_handlingskatalog',
  description: 'Gem udtrukne indsatsområder og handlinger fra handlingskataloget',
  input_schema: {
    type: 'object' as const,
    properties: {
      indsatsomraader: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            navn: { type: 'string', description: 'Navn på indsatsområde, maks 60 tegn' },
            type: { type: 'string', enum: ['ghg_reduction', 'adaptation', 'consumption', 'just_transition', 'cross_cutting'] },
            sektor: { type: 'string', enum: ['energy', 'transport', 'buildings', 'food', 'agriculture', 'waste', 'adaptation', 'other'] },
            beskrivelse: { type: 'string' },
            handlinger: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  titel: { type: 'string', description: 'Handlingens titel, maks 80 tegn' },
                  type: { type: 'string', enum: ['reduction', 'adaptation', 'both'] },
                  status: { type: 'string', enum: ['planned', 'in_progress', 'completed', 'discontinued'] },
                  beskrivelse: { type: 'string' },
                },
                required: ['titel', 'type', 'status'],
              },
            },
          },
          required: ['navn', 'type', 'sektor', 'handlinger'],
        },
      },
    },
    required: ['indsatsomraader'],
  },
};

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
  if (!['pdf', 'csv', 'xlsx', 'xls', 'docx'].includes(ext)) {
    return NextResponse.json({ error: `Filtype .${ext} understøttes ikke` }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let userContent: Anthropic.MessageParam['content'];

  if (ext === 'pdf') {
    // Send PDF directly to Claude — no text extraction needed, handles full document natively
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    userContent = [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      } as Anthropic.DocumentBlockParam,
      { type: 'text', text: 'Udtræk alle indsatsområder og handlinger fra dette handlingskatalog.' },
    ];
  } else {
    let text: string;
    try {
      if (ext === 'csv') {
        text = await file.text();
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'buffer' });
        text = wb.SheetNames.map((n) => `=== ${n} ===\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n');
      } else {
        const mammoth = await import('mammoth');
        const buffer = await file.arrayBuffer();
        text = (await mammoth.extractRawText({ buffer: Buffer.from(buffer) })).value;
      }
    } catch (e: unknown) {
      return NextResponse.json({ error: `Kunne ikke læse filen: ${e instanceof Error ? e.message : e}` }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'Filen ser ud til at være tom eller kan ikke læses' }, { status: 400 });
    }

    userContent = `Udtræk alle indsatsområder og handlinger fra dette handlingskatalog:\n\n${text.slice(0, MAX_TEXT_CHARS)}`;
  }

  try {
    const response = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 8096,
        system: SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'gem_handlingskatalog' },
        messages: [{ role: 'user', content: userContent }],
      },
      { timeout: 55_000 },
    );

    const toolUse = response.content.find((b) => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
    if (!toolUse) {
      return NextResponse.json({ error: 'AI returnerede ikke struktureret data — prøv igen' }, { status: 500 });
    }
    return NextResponse.json(toolUse.input);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return NextResponse.json({ error: 'AI-analysen tog for lang tid. Prøv med en kortere fil.' }, { status: 504 });
    }
    return NextResponse.json({ error: `AI-fejl: ${msg}` }, { status: 500 });
  }
}
