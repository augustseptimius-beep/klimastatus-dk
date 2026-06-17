import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { standardtiltagKategoriEnum, sektorEnum, tiltagTypeEnum } from './enums';

// Nationalt katalog over navngivne standardtiltag fra CO₂-analysen.
// Kilde: evidensgrundlag §6.3 [D2 s.28–37]. National template — IKKE per-kommune
// (den per-kommune tabel er `tiltag`).
export const standardtiltag = pgTable('standardtiltag', {
  id: uuid('id').primaryKey().defaultRandom(),
  titel: text('titel').notNull(),
  kategori: standardtiltagKategoriEnum('kategori').notNull(),
  sektor: sektorEnum('sektor'),
  udbredelsesProcent: integer('udbredelses_procent'),
  type: tiltagTypeEnum('type').notNull().default('reduction'),
  beskrivelse: text('beskrivelse'),
  aktiv: boolean('aktiv').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('standardtiltag_titel_unique').on(t.titel),
]);
