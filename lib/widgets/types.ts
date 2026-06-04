export type WidgetBredde = 1 | 2 | 3 | 4;

export type ConfigFelt =
  | { key: string; type: 'text'; label: string; standard: string; multiline?: boolean }
  | { key: string; type: 'number'; label: string; standard: number; min?: number; max?: number }
  | { key: string; type: 'select'; label: string; standard: string; valg: { value: string; label: string }[] }
  | {
      key: string;
      type: 'multiselect';
      label: string;
      standard: string[];
      maxValg?: number;
      kilde?: 'kommuneIndikatorer';
    };

export type WidgetDefinition = {
  type: string;
  navn: string;
  beskrivelse: string;
  ikon: string; // lucide-react ikon-navn
  tilladteBredder: WidgetBredde[];
  standardBredde: WidgetBredde;
  configFelter: ConfigFelt[];
};

export type WidgetInstans = {
  id: string;
  type: string;
  width: WidgetBredde;
  enabled: boolean;
  config: Record<string, unknown>;
};

export type WidgetProps<TData> = {
  data: TData;
  config: Record<string, unknown>;
  width: WidgetBredde;
};
