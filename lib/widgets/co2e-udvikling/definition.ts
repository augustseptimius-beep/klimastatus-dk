import type { WidgetDefinition } from '../types';

export const definition: WidgetDefinition = {
  type: 'co2e-udvikling',
  navn: 'CO₂e-udvikling',
  beskrivelse: 'Graf over udledningen pr. år med målstreg mod målåret.',
  ikon: 'TrendingDown',
  tilladteBredder: [2, 3, 4],
  standardBredde: 4,
  configFelter: [
    { key: 'titel', type: 'text', label: 'Titel', standard: 'Udvikling i CO₂e-udledning' },
    {
      key: 'enhed', type: 'select', label: 'Enhed', standard: 'total',
      valg: [{ value: 'total', label: 'Total (ton)' }, { value: 'per_capita', label: 'Pr. indbygger' }],
    },
  ],
};
