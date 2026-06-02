import { pgEnum } from 'drizzle-orm/pg-core';

export const tiltagStatusEnum = pgEnum('tiltag_status', [
  'planned', 'in_progress', 'completed', 'discontinued',
]);
export const tiltagTypeEnum = pgEnum('tiltag_type', [
  'reduction', 'adaptation', 'both',
]);

export const indsatsTypeEnum = pgEnum('indsats_type', [
  'ghg_reduction', 'adaptation', 'consumption', 'just_transition', 'cross_cutting',
]);
export const sektorEnum = pgEnum('sektor', [
  'energy', 'transport', 'buildings', 'food', 'agriculture', 'waste', 'adaptation', 'other',
]);

export const maalTypeEnum = pgEnum('maal_type', ['smart', 'qualitative']);
export const tidsrammeEnum = pgEnum('tidsramme', ['short', 'medium', 'long']);
export const maalKategoriEnum = pgEnum('maal_kategori', [
  'reduction', 'adaptation', 'co_benefits', 'consumption',
]);

export const befoejelsesKategoriEnum = pgEnum('befojelses_kategori', [
  'enterprise', 'supplier', 'authority', 'facilitator',
]);
export const avoidShiftImproveEnum = pgEnum('avoid_shift_improve', [
  'avoid', 'shift', 'improve',
]);

export const indikatorNiveauEnum = pgEnum('indikator_niveau', [
  'output', 'outcome', 'impact',
]);
export const datakildeTypeEnum = pgEnum('datakilde_type', ['manual', 'api']);
export const apiKildeEnum = pgEnum('api_kilde', [
  'klimaregnskab', 'energidataservice', 'bbr', 'dst', 'klimaatlas', 'kamp', 'hip',
]);

export const aktoerTypeEnum = pgEnum('aktoer_type', [
  'internal', 'external', 'citizen', 'business', 'utility', 'civil_society', 'political',
]);
export const gruppeTagEnum = pgEnum('gruppe_tag', [
  'affected_by_climate_change', 'affected_by_climate_action', 'has_power_influence',
]);

export const saarbarGruppeKategoriEnum = pgEnum('saarbar_gruppe_kategori', [
  'low_income', 'elderly', 'children', 'disability', 'ethnicity', 'geography', 'other',
]);

export const klimafareTypeEnum = pgEnum('klimafare_type', [
  'flooding', 'drought', 'heat', 'storm', 'sea_level_rise', 'groundwater', 'other',
]);

export const severityEnum = pgEnum('severity', ['low', 'medium', 'high']);
export const scenarieTypeEnum = pgEnum('scenarie_type', ['bau', 'action']);
export const dokumentationsstyrkeEnum = pgEnum('dokumentationsstyrke', ['primary', 'secondary']);
export const kriterieStatusEnum = pgEnum('kriterie_status', ['complete', 'partial', 'missing']);
export const auditActionEnum = pgEnum('audit_action', ['create', 'update', 'delete']);
export const importJobStatusEnum = pgEnum('import_job_status', [
  'pending', 'processing', 'complete', 'failed',
]);
export const laeringsBeslutningEnum = pgEnum('laerings_beslutning', [
  'viderefoeres', 'justeres', 'udgaar', 'tilfoeres_ressourcer', 'eskaleres',
]);
export const laeringsKnytningEnum = pgEnum('laerings_knytning', [
  'tiltag', 'indsatsomraade', 'maal',
]);

export const monitoreringsTypeEnum = pgEnum('monitorerings_type', [
  'aarlig', 'kvartal', 'ad_hoc',
]);
export const monitoreringsStatusEnum = pgEnum('monitorerings_status', [
  'aaben', 'lukket', 'rapporteret',
]);
