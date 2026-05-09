import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { auditActionEnum } from './enums';

export const auditEvent = pgTable('audit_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  entitetType: text('entitet_type').notNull(),
  entitetId: uuid('entitet_id').notNull(),
  action: auditActionEnum('action').notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  ipAddress: text('ip_address'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});
