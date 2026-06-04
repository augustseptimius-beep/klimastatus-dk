import type { WidgetBredde, WidgetDefinition, WidgetInstans, ConfigFelt } from './types';

function naermesteBredde(
  oenske: number,
  tilladte: WidgetBredde[],
): WidgetBredde {
  return [...tilladte].sort(
    (a, b) => Math.abs(a - oenske) - Math.abs(b - oenske),
  )[0];
}

function standardForFelt(felt: ConfigFelt): unknown {
  return felt.standard;
}

function saneerConfig(
  raw: unknown,
  felter: ConfigFelt[],
): Record<string, unknown> {
  const input =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const felt of felter) {
    out[felt.key] =
      felt.key in input ? input[felt.key] : standardForFelt(felt);
  }
  return out;
}

export function saneerWidgets(
  raw: WidgetInstans[],
  defs: Record<string, WidgetDefinition>,
): WidgetInstans[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((w) => w && typeof w.type === 'string' && defs[w.type])
    .map((w) => {
      const def = defs[w.type];
      return {
        id: typeof w.id === 'string' ? w.id : crypto.randomUUID(),
        type: w.type,
        width: def.tilladteBredder.includes(w.width as WidgetBredde)
          ? (w.width as WidgetBredde)
          : naermesteBredde(
              w.width ?? def.standardBredde,
              def.tilladteBredder,
            ),
        enabled: w.enabled !== false,
        config: saneerConfig(w.config, def.configFelter),
      };
    });
}
