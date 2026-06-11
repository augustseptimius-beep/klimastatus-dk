// Status er bevidst binær. En tælle-heuristik må aldrig hedde "komplet"
// over for en certificering — vi ved kun OM der er dokumentation, ikke om
// kriteriets faktiske krav er opfyldt.
export type CctfKriterieStatus = 'dokumenteret' | 'manglende';

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
