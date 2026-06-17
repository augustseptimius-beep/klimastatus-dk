// Danmarks Statistiks 5 kommunetyper. Kilde: evidensgrundlag §6.1 [D2 s.31, Figur 10].
export const KOMMUNETYPER = ['land', 'oplands', 'provinsby', 'storby', 'hovedstad'] as const;

export type Kommunetype = typeof KOMMUNETYPER[number];

export const KOMMUNETYPE_LABEL: Record<Kommunetype, string> = {
  land: 'Landkommune',
  oplands: 'Oplandskommune',
  provinsby: 'Provinsbykommune',
  storby: 'Storbykommune',
  hovedstad: 'Hovedstadskommune',
};
