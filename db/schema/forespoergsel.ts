import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { tovholder } from './tovholder';
import { tiltag } from './tiltag';
import { monitoreringscyklus } from './monitorering';
import { forespoergselStatusEnum } from './enums';

export const forespoergsel = pgTable('forespoergsel', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  tovholderId: uuid('tovholder_id').references(() => tovholder.id, { onDelete: 'cascade' }).notNull(),
  tiltagId: uuid('tiltag_id').references(() => tiltag.id, { onDelete: 'cascade' }).notNull(),
  monitoreringscyklusId: uuid('monitoreringscyklus_id').references(() => monitoreringscyklus.id, { onDelete: 'set null' }),
  spoergsmaal: text('spoergsmaal'),
  status: forespoergselStatusEnum('status').notNull().default('sendt'),
  sendtAt: timestamp('sendt_at', { withTimezone: true }).defaultNow().notNull(),
  besvaretAt: timestamp('besvaret_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
