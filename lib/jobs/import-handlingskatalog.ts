import Anthropic from '@anthropic-ai/sdk';
import { getImportJob, updateImportJobStatus } from '@/db/queries/import-job';

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

export async function handleImportHandlingskatalog(data: { importJobId: string }): Promise<void> {
  const { importJobId } = data;

  const job = await getImportJob(importJobId);
  if (!job) throw new Error(`Import job ${importJobId} ikke fundet`);

  await updateImportJobStatus(importJobId, 'processing');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let userContent: Anthropic.MessageParam['content'];

  if (job.filtype === 'pdf') {
    userContent = [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: job.filindhold },
      } as Anthropic.DocumentBlockParam,
      { type: 'text', text: 'Udtræk alle indsatsområder og handlinger fra dette handlingskatalog.' },
    ];
  } else {
    userContent = `Udtræk alle indsatsområder og handlinger fra dette handlingskatalog:\n\n${job.filindhold}`;
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'gem_handlingskatalog' },
      messages: [{ role: 'user', content: userContent }],
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
    if (!toolUse) {
      await updateImportJobStatus(importJobId, 'failed', { fejl: 'AI returnerede ikke struktureret data — prøv igen' });
      return;
    }

    await updateImportJobStatus(importJobId, 'complete', { resultat: toolUse.input });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateImportJobStatus(importJobId, 'failed', { fejl: `AI-fejl: ${msg}` });
  }
}
