import { pgTable, uuid, text, integer, date, timestamp, unique } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { monitoreringsTypeEnum, monitoreringsStatusEnum } from './enums';

export const monitoreringscyklus = pgTable('monitoreringscyklus', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  navn: text('navn').notNull(),
  periodeStart: date('periode_start'),
  periodeSlut: date('periode_slut'),
  type: monitoreringsTypeEnum('type').notNull(),
  aar: integer('aar'),
  status: monitoreringsStatusEnum('status').notNull().default('aaben'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('monitoreringscyklus_kommune_type_aar_unique').on(t.kommuneId, t.type, t.aar),
]);
