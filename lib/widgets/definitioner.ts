import type { WidgetDefinition } from './types';
import { definition as klimamaalHero } from './klimamaal-hero/definition';
import { definition as co2eUdvikling } from './co2e-udvikling/definition';
import { definition as noegletal } from './noegletal/definition';
import { definition as tekstblok } from './tekstblok/definition';
import { definition as indsatserOversigt } from './indsatser-oversigt/definition';

export const DEFINITIONER: Record<string, WidgetDefinition> = {
  'klimamaal-hero': klimamaalHero,
  'co2e-udvikling': co2eUdvikling,
  noegletal,
  tekstblok,
  'indsatser-oversigt': indsatserOversigt,
};

export function definitionListe(): WidgetDefinition[] {
  return Object.values(DEFINITIONER);
}
