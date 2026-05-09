import { pgTable, uuid, text, boolean, date, timestamp } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { tiltag } from './tiltag';

export const tovholder = pgTable('tovholder', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  navn: text('navn').notNull(),
  forvaltning: text('forvaltning'),
  email: text('email').notNull(),
  aktiv: boolean('aktiv').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tovholderTiltag = pgTable('tovholder_tiltag', {
  id: uuid('id').primaryKey().defaultRandom(),
  tovholderId: uuid('tovholder_id').references(() => tovholder.id, { onDelete: 'cascade' }).notNull(),
  tiltagId: uuid('tiltag_id').references(() => tiltag.id, { onDelete: 'cascade' }).notNull(),
});

export const tovholderRapport = pgTable('tovholder_rapport', {
  id: uuid('id').primaryKey().defaultRandom(),
  tovholderId: uuid('tovholder_id').references(() => tovholder.id, { onDelete: 'cascade' }).notNull(),
  tiltagId: uuid('tiltag_id').references(() => tiltag.id, { onDelete: 'cascade' }).notNull(),
  dato: date('dato').notNull(),
  statusImplementering: text('status_implementering'),
  statusBeskrivelse: text('status_beskrivelse'),
  barrierer: text('barrierer'),
  naesteSkrid: text('naeste_skridt'),
  effektRealiseret: text('effekt_realiseret'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
