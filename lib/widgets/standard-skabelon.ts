import type { WidgetInstans } from './types';

/** Bruges når en kommune endnu ikke har konfigureret sit dashboard. */
export function standardSkabelon(): WidgetInstans[] {
  return [
    { id: 'std-hero', type: 'klimamaal-hero', width: 4, enabled: true, config: { overskrift: 'Klimastatus' } },
    { id: 'std-graf', type: 'co2e-udvikling', width: 4, enabled: true, config: { titel: 'Udvikling i CO₂e-udledning', enhed: 'total' } },
    { id: 'std-noegletal', type: 'noegletal', width: 4, enabled: true, config: { indikatorer: [] } },
  ];
}
