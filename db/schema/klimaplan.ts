import { pgTable, uuid, text, integer, real, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { indsatsTypeEnum, sektorEnum, maalTypeEnum, tidsrammeEnum, maalKategoriEnum } from './enums';

export const indsatsOmraade = pgTable('indsats_omraade', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  navn: text('navn').notNull(),
  type: indsatsTypeEnum('type').notNull(),
  sektor: sektorEnum('sektor').notNull(),
  forbrugskategoriTag: text('forbrugskategori_tag'),
  ansvarligForvaltning: text('ansvarlig_forvaltning'),
  beskrivelse: text('beskrivelse'),
  aktiv: boolean('aktiv').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('indsats_omraade_kommune_navn_unique').on(t.kommuneId, t.navn),
]);

export const maal = pgTable('maal', {
  id: uuid('id').primaryKey().defaultRandom(),
  indsatsOmraadeId: uuid('indsats_omraade_id').references(() => indsatsOmraade.id, { onDelete: 'cascade' }).notNull(),
  type: maalTypeEnum('type').notNull(),
  tidsramme: tidsrammeEnum('tidsramme').notNull(),
  maalAar: integer('maal_aar'),
  maalVaerdi: real('maal_vaerdi'),
  enhed: text('enhed'),
  baselineVaerdi: real('baseline_vaerdi'),
  baselineAar: integer('baseline_aar'),
  beskrivelse: text('beskrivelse').notNull(),
  kategori: maalKategoriEnum('kategori').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
