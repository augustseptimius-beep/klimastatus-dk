import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { dokumentationsstyrkeEnum } from './enums';

export const cctfKriterie = pgTable('cctf_kriterie', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: text('version').notNull(),
  kriterieNr: integer('kriterie_nr').notNull(),
  komponent: text('komponent').notNull(),
  titel: text('titel').notNull(),
  beskrivelse: text('beskrivelse').notNull(),
  krav: jsonb('krav'),
  aktiv: boolean('aktiv').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('cctf_kriterie_version_nr_unique').on(table.version, table.kriterieNr),
]);

export const cctfKriterieMapping = pgTable('cctf_kriterie_mapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  entitetType: text('entitet_type').notNull(),
  entitetId: uuid('entitet_id').notNull(),
  kriterieNr: integer('kriterie_nr').notNull(),
  dokumentationsstyrke: dokumentationsstyrkeEnum('dokumentationsstyrke').notNull().default('primary'),
  bemaerkning: text('bemaerkning'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('cctf_kriterie_mapping_entitet_kriterie_unique').on(table.entitetType, table.entitetId, table.kriterieNr),
]);

export const selvevaluering = pgTable('selvevaluering', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  cctfVersion: text('cctf_version').notNull(),
  version: integer('version').notNull().default(1),
  genereretDato: timestamp('genereret_dato', { withTimezone: true }).defaultNow().notNull(),
  godkendtAf: uuid('godkendt_af'),
  godkendelsesdato: timestamp('godkendelsesdato', { withTimezone: true }),
  kriterieData: jsonb('kriterie_data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
