import { verifySession } from '@/lib/dal';
import { getKommuneBySubdomain } from '@/db/queries/kommune';
import { hentStatusnotatData, type StatusFordeling } from '@/lib/rapport/statusnotat';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType,
} from 'docx';

const datoFormat = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
const talFormat = new Intl.NumberFormat('da-DK');

function fordelingTekst(f: StatusFordeling): string {
  const dele: string[] = [];
  if (f.completed > 0) dele.push(`${f.completed} gennemført`);
  if (f.in_progress > 0) dele.push(`${f.in_progress} i gang`);
  if (f.planned > 0) dele.push(`${f.planned} planlagt`);
  if (f.discontinued > 0) dele.push(`${f.discontinued} udgået`);
  return dele.length > 0 ? dele.join(' · ') : 'ingen handlinger';
}

function h2(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } });
}

function punkt(children: TextRun[]): Paragraph {
  return new Paragraph({ children, bullet: { level: 0 }, spacing: { after: 60 } });
}

function celle(text: string, opts: { bold?: boolean } = {}): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: 21 })] })],
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kommune: string }> },
) {
  const { kommune: slug } = await params;

  const session = await verifySession();
  if (!session) return new Response('Ikke autoriseret', { status: 401 });

  const kommune = await getKommuneBySubdomain(slug);
  if (!kommune) return new Response('Ikke fundet', { status: 404 });
  if (session.role === 'koordinator' && session.kommuneId !== kommune.id) {
    return new Response('Ikke fundet', { status: 404 });
  }

  const data = await hentStatusnotatData(kommune.id);
  const { totaler, tovholderRunde } = data;

  const indhold: (Paragraph | Table)[] = [
    new Paragraph({ text: 'Statusnotat — klimahandlingsplan', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [new TextRun({
        text: `${kommune.navn} Kommune · genereret ${datoFormat.format(data.genereret)}`,
        color: '666666', size: 21,
      })],
      spacing: { after: 200 },
    }),

    h2('Overblik'),
    punkt([
      new TextRun({ text: `${totaler.fordeling.in_progress} af ${totaler.antalAktive} `, bold: true }),
      new TextRun(`aktive handlinger er i gang (${fordelingTekst(totaler.fordeling)}).`),
    ]),
    punkt([
      new TextRun('Forventet samlet CO₂-reduktion fra handlingerne: '),
      new TextRun({ text: `${talFormat.format(Math.round(totaler.co2SumTon))} ton CO₂e`, bold: true }),
      new TextRun(totaler.tiltagUdenEffekt > 0 ? ' (undervurderet — se datagrundlag).' : '.'),
    ]),
    ...(data.reduktionsMaal ? [punkt([
      new TextRun(
        `Reduktionsmål: fra ${talFormat.format(data.reduktionsMaal.baselineVaerdi)} (${data.reduktionsMaal.baselineAar}) ` +
        `til ${talFormat.format(data.reduktionsMaal.maalVaerdi)} ${data.reduktionsMaal.enhed ?? ''} i ${data.reduktionsMaal.maalAar}.`,
      ),
    ])] : []),
    punkt([
      new TextRun('Tovholder-status: '),
      new TextRun({ text: `${tovholderRunde.harSvaret} af ${tovholderRunde.aktive}`, bold: true }),
      new TextRun(' tovholdere har rapporteret inden for de seneste 30 dage.'),
    ]),

    h2('Fremdrift pr. indsatsområde'),
  ];

  if (data.indsatser.length === 0) {
    indhold.push(new Paragraph('Ingen indsatsområder endnu.'));
  } else {
    indhold.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celle('Indsatsområde', { bold: true }),
            celle('Handlinger', { bold: true }),
            celle('Forventet CO₂-effekt', { bold: true }),
          ],
        }),
        ...data.indsatser.map((io) => new TableRow({
          children: [
            celle(io.navn),
            celle(fordelingTekst(io.fordeling)),
            celle(
              io.antalAktive === 0
                ? '—'
                : io.co2SumTon > 0
                  ? `${talFormat.format(Math.round(io.co2SumTon))} t CO₂e${io.tiltagUdenEffekt > 0 ? ` (${io.tiltagUdenEffekt} uden skøn)` : ''}`
                  : `intet skøn (${io.tiltagUdenEffekt} af ${io.antalAktive} mangler)`,
            ),
          ],
        })),
      ],
    }));
  }

  if (data.kpi.length > 0) {
    indhold.push(h2('Nøgletal (automatisk indhentet)'));
    indhold.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [celle('Indikator', { bold: true }), celle('Seneste værdi', { bold: true }), celle('År', { bold: true })],
        }),
        ...data.kpi.map((k) => new TableRow({
          children: [
            celle(k.titel),
            celle(`${talFormat.format(k.vaerdi)}${k.enhed ? ` ${k.enhed}` : ''}`),
            celle(String(k.aar)),
          ],
        })),
      ],
    }));
  }

  indhold.push(h2(`Barrierer der afventer beslutning (${data.antalBarrierer})`));
  if (data.barrierer.length === 0) {
    indhold.push(new Paragraph('Ingen ubehandlede barrierer fra tovholderne.'));
  } else {
    for (const b of data.barrierer) {
      indhold.push(punkt([
        new TextRun({ text: `${b.tiltagTitel}: `, bold: true }),
        new TextRun(`${b.barrierer} (${b.dato})`),
      ]));
    }
    if (data.antalBarrierer > data.barrierer.length) {
      indhold.push(new Paragraph(`… og ${data.antalBarrierer - data.barrierer.length} flere i læringsoversigten.`));
    }
  }

  if (data.beslutninger.length > 0) {
    indhold.push(h2('Seneste beslutninger'));
    for (const b of data.beslutninger) {
      indhold.push(punkt([
        new TextRun({ text: `${b.beslutning}: `, bold: true }),
        new TextRun(`${b.observation} (${b.dato})`),
      ]));
    }
  }

  indhold.push(h2('Datagrundlag'));
  if (totaler.tiltagUdenEffekt === 0 && data.ufuldstaendigeMaalAntal === 0) {
    indhold.push(new Paragraph('Alle aktive handlinger har effekt-skøn, og alle reduktionsmål er komplette.'));
  } else {
    if (totaler.tiltagUdenEffekt > 0) {
      indhold.push(new Paragraph(
        `Effekt-skøn mangler på ${totaler.tiltagUdenEffekt} af ${totaler.antalAktive} aktive handlinger — ` +
        'den samlede CO₂-effekt er derfor undervurderet.',
      ));
    }
    if (data.ufuldstaendigeMaalAntal > 0) {
      indhold.push(new Paragraph(
        `${data.ufuldstaendigeMaalAntal} reduktionsmål mangler baseline- eller målværdier og indgår ikke i grafer.`,
      ));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
        heading1: { run: { size: 32, bold: true, color: '1E6B3A' } },
        heading2: { run: { size: 26, bold: true, color: '1E6B3A' } },
      },
    },
    sections: [{ children: indhold }],
  });

  const buffer = await Packer.toBuffer(doc);
  const dato = data.genereret.toISOString().split('T')[0];

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="statusnotat-${slug}-${dato}.docx"`,
    },
  });
}
