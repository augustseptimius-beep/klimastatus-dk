import { pgTable, uuid, text, integer, real, boolean, timestamp } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { indsatsOmraade } from './klimaplan';
import { tiltag } from './tiltag';
import { scenarieTypeEnum, befoejelsesKategoriEnum } from './enums';

export const drivhusgasregnskabPost = pgTable('drivhusgasregnskab_post', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  aar: integer('aar').notNull(),
  gpcSektor: text('gpc_sektor').notNull(),
  udledningTonCo2e: real('udledning_ton_co2e').notNull(),
  datakilde: text('datakilde'),
  gpcKompatibel: boolean('gpc_kompatibel').notNull().default(true),
  metodeversion: text('metodeversion'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const scenariePost = pgTable('scenarie_post', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  scenarieType: scenarieTypeEnum('scenarie_type').notNull(),
  aar: integer('aar').notNull(),
  sektor: text('sektor'),
  udledningTonCo2e: real('udledning_ton_co2e').notNull(),
  metodeBeskrivelse: text('metode_beskrivelse'),
  tiltagId: uuid('tiltag_id').references(() => tiltag.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const befoejelsesVurdering = pgTable('befojelses_vurdering', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  indsatsOmraadeId: uuid('indsats_omraade_id').references(() => indsatsOmraade.id).notNull(),
  rolle: befoejelsesKategoriEnum('rolle').notNull(),
  aktiveTiltagCount: integer('aktive_tiltag_count'),
  udnyttelsesvurderingTekst: text('udnyttelsesvurdering_tekst'),
  manglerTekst: text('mangler_tekst'),
  dato: text('dato'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
