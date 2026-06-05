export type ImportHandling = {
  titel: string;
  type: 'reduction' | 'adaptation' | 'both';
  status: 'planned' | 'in_progress' | 'completed' | 'discontinued';
  beskrivelse?: string;
};

export type ImportIndsats = {
  navn: string;
  type: 'ghg_reduction' | 'adaptation' | 'consumption' | 'just_transition' | 'cross_cutting';
  sektor: 'energy' | 'transport' | 'buildings' | 'food' | 'agriculture' | 'waste' | 'adaptation' | 'other';
  beskrivelse?: string;
  handlinger: ImportHandling[];
};
