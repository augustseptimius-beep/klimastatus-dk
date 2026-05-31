import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { tovholderRapport } from './tovholder';
import { laeringsBeslutningEnum, laeringsKnytningEnum } from './enums';

export const laeringspost = pgTable('laeringspost', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  // Polymorf kobling — ingen FK, valideres i applikationslaget.
  knyttetTilType: laeringsKnytningEnum('knyttet_til_type').notNull(),
  knyttetTilId: uuid('knyttet_til_id').notNull(),
  observation: text('observation').notNull(),
  fortolkning: text('fortolkning'),
  beslutning: laeringsBeslutningEnum('beslutning').notNull(),
  beslutningstager: text('beslutningstager'),
  dato: date('dato').notNull(),
  // Reference til den rapport der udløste læringen (nullable).
  tovholderRapportId: uuid('tovholder_rapport_id')
    .references(() => tovholderRapport.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
