export type CctfKriterieStatus = 'komplet' | 'delvis' | 'manglende' | 'afventer';

export type CctfKriterieResult = {
  kriterieNr: number;
  status: CctfKriterieStatus;
  checks: CctfCheck[];
};

export type CctfCheck = {
  entitetType: string;
  entitetId: string;
  label: string;
};
