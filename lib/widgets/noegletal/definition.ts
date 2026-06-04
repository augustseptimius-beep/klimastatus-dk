import type { WidgetDefinition } from '../types';

export const definition: WidgetDefinition = {
  type: 'noegletal',
  navn: 'Nøgletal',
  beskrivelse: 'Op til 5 udvalgte indikatorer med seneste værdi og udvikling.',
  ikon: 'Gauge',
  tilladteBredder: [2, 3, 4],
  standardBredde: 4,
  configFelter: [
    { key: 'indikatorer', type: 'multiselect', label: 'Vælg indikatorer', standard: [], maxValg: 5, kilde: 'kommuneIndikatorer' },
  ],
};
