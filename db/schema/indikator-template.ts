import { pgTable, uuid, text, boolean, integer, real, timestamp, unique, uniqueIndex } from 'drizzle-orm/pg-core';
import { apiKildeEnum, dataKarakterEnum, dataProvenansEnum, indikatorNiveauEnum, sektorEnum } from './enums';
import { kommune } from './kommune';
import { indikator } from './indikator';

export const indikatorTemplate = pgTable('indikator_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  titel: text('titel').notNull(),
  kilde: apiKildeEnum('kilde'),
  apiQuery: text('api_query'),
  enhed: text('enhed').notNull(),
  beskrivelse: text('beskrivelse').notNull(),
  cctfKriterier: integer('cctf_kriterier').array().notNull().default([]),
  niveau: indikatorNiveauEnum('niveau'),
  sektor: sektorEnum('sektor'),
  dataProvenans: dataProvenansEnum('data_provenans'),
  dataKarakter: dataKarakterEnum('data_karakter'),
  nationalMaalvaerdi: real('national_maalvaerdi'),
  nationalMaalvaerdiNote: text('national_maalvaerdi_note'),
  aktiv: boolean('aktiv').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('indikator_template_titel_unique').on(t.titel),
]);

export const kommuneIndikator = pgTable('kommune_indikator', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  templateId: uuid('template_id').references(() => indikatorTemplate.id, { onDelete: 'restrict' }).notNull(),
  indikatorId: uuid('indikator_id').references(() => indikator.id, { onDelete: 'restrict' }).notNull(),
  visningsnavn: text('visningsnavn'),
  aktiv: boolean('aktiv').notNull().default(true),
  sidstHentet: timestamp('sidst_hentet', { withTimezone: true }),
  sidsteFejl: timestamp('sidste_fejl', { withTimezone: true }),
  sidsteFejlBesked: text('sidste_fejl_besked'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('kommune_indikator_kommune_template_unique').on(t.kommuneId, t.templateId),
]);
