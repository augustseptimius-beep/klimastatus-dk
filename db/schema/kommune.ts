import { pgTable, uuid, text, integer, real, date, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const kommune = pgTable('kommune', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommunekode: text('kommunekode').notNull().unique(),
  navn: text('navn').notNull(),
  befolkningstal: integer('befolkningstal'),
  arealKm2: real('areal_km2'),
  klimakommitmentDato: date('klimakommitment_dato'),
  klimakommitmentTekst: text('klimakommitment_tekst'),
  recertificeringsdato: date('recertificeringsdato'),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color'),
  secondaryColor: text('secondary_color'),
  fontFamily: text('font_family'),
  subdomain: text('subdomain').notNull().unique(),
  publicEnabled: boolean('public_enabled').notNull().default(false),
  publicStaleDays: integer('public_stale_days'),
  publicHighlights: text('public_highlights').array(),
  publicWidgets: jsonb('public_widgets'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
