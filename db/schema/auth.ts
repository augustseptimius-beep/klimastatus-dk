import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';

export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  navn: text('navn').notNull(),
  role: text('role').notNull().default('koordinator'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const magicLink = pgTable('magic_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  tovholderId: uuid('tovholder_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  // 'used' betyder "rapport indsendt" — ikke "link åbnet".
  used: boolean('used').notNull().default(false),
  rykkerAntal: integer('rykker_antal').notNull().default(0),
  sidstRykketAt: timestamp('sidst_rykket_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
