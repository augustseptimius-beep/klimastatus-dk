import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { importJobStatusEnum } from './enums';

export const importJob = pgTable('import_job', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').notNull().references(() => kommune.id, { onDelete: 'cascade' }),
  filnavn: text('filnavn').notNull(),
  filtype: text('filtype').notNull(),
  filindhold: text('filindhold').notNull(),
  status: importJobStatusEnum('status').notNull().default('pending'),
  resultat: jsonb('resultat'),
  fejl: text('fejl'),
  oprettet: timestamp('oprettet', { withTimezone: true }).defaultNow().notNull(),
  opdateret: timestamp('opdateret', { withTimezone: true }).defaultNow().notNull(),
});
