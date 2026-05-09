import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { indsatsOmraade } from './klimaplan';
import {
  klimafareTypeEnum, severityEnum,
  aktoerTypeEnum, gruppeTagEnum,
  saarbarGruppeKategoriEnum,
} from './enums';

export const klimafare = pgTable('klimafare', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  type: klimafareTypeEnum('type').notNull(),
  sandsynlighed: text('sandsynlighed'),
  hyppighed: text('hyppighed'),
  intensitet: text('intensitet'),
  tidsskala: text('tidsskala'),
  rumligFordelingGeometri: jsonb('rumlig_fordeling_geometri'),
  datakilde: text('datakilde'),
  dataDato: text('data_dato'),
  dataVersion: text('data_version'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const konsekvensvurdering = pgTable('konsekvensvurdering', {
  id: uuid('id').primaryKey().defaultRandom(),
  klimafareId: uuid('klimafare_id').references(() => klimafare.id, { onDelete: 'cascade' }).notNull(),
  beroertKategori: text('beroert_kategori').notNull(),
  beroertId: uuid('beroert_id'),
  konsekvensBeskrivelse: text('konsekvens_beskrivelse'),
  alvor: severityEnum('alvor'),
  tilpasningskapacitet: severityEnum('tilpasningskapacitet'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aktoer = pgTable('aktoer', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  navn: text('navn').notNull(),
  type: aktoerTypeEnum('type').notNull(),
  inddragelsesform: text('inddragelsesform'),
  inddragelsesfrekvens: text('inddragelsesfrekvens'),
  paavirkningPaaPlanTekst: text('paavirkning_paa_plan_tekst'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aktoerGruppeTag = pgTable('aktoer_gruppe_tag', {
  id: uuid('id').primaryKey().defaultRandom(),
  aktoerId: uuid('aktoer_id').references(() => aktoer.id, { onDelete: 'cascade' }).notNull(),
  gruppeTag: gruppeTagEnum('gruppe_tag').notNull(),
});

export const saarbarGruppe = pgTable('saarbar_gruppe', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  gruppeKategori: saarbarGruppeKategoriEnum('gruppe_kategori').notNull(),
  beskrivelse: text('beskrivelse'),
  vidensgrundlagKilde: text('vidensgrundlag_kilde'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const saarbarGruppeKlimafare = pgTable('saarbar_gruppe_klimafare', {
  id: uuid('id').primaryKey().defaultRandom(),
  saarbarGruppeId: uuid('saarbar_gruppe_id').references(() => saarbarGruppe.id, { onDelete: 'cascade' }).notNull(),
  klimafareId: uuid('klimafare_id').references(() => klimafare.id, { onDelete: 'cascade' }).notNull(),
});

export const saarbarGruppeIndsatsOmraade = pgTable('saarbar_gruppe_indsats_omraade', {
  id: uuid('id').primaryKey().defaultRandom(),
  saarbarGruppeId: uuid('saarbar_gruppe_id').references(() => saarbarGruppe.id, { onDelete: 'cascade' }).notNull(),
  indsatsOmraadeId: uuid('indsats_omraade_id').references(() => indsatsOmraade.id, { onDelete: 'cascade' }).notNull(),
});
