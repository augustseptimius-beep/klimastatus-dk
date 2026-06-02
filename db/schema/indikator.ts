import { pgTable, uuid, text, real, integer, boolean, date, timestamp, unique } from 'drizzle-orm/pg-core';
import { indikatorNiveauEnum, datakildeTypeEnum, apiKildeEnum } from './enums';
import { tiltag } from './tiltag';
import { maal, indsatsOmraade } from './klimaplan';
import { monitoreringscyklus } from './monitorering';

export const indikator = pgTable('indikator', {
  id: uuid('id').primaryKey().defaultRandom(),
  niveau: indikatorNiveauEnum('niveau').notNull(),
  beskrivelse: text('beskrivelse').notNull(),
  enhed: text('enhed'),
  datakildeType: datakildeTypeEnum('datakilde_type').notNull(),
  apiKilde: apiKildeEnum('api_kilde'),
  apiQuery: text('api_query'),
  aggregeringsformel: text('aggregeringsformel'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const indikatorMaaling = pgTable('indikator_maaling', {
  id: uuid('id').primaryKey().defaultRandom(),
  indikatorId: uuid('indikator_id').references(() => indikator.id, { onDelete: 'cascade' }).notNull(),
  monitoreringscyklusId: uuid('monitoreringscyklus_id')
    .references(() => monitoreringscyklus.id, { onDelete: 'cascade' }).notNull(),
  dato: date('dato'),
  aar: integer('aar'),
  vaerdi: real('vaerdi').notNull(),
  kilde: text('kilde'),
  bemaerkning: text('bemaerkning'),
  autoHentet: boolean('auto_hentet').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('indikator_maaling_indikator_cyklus_unique').on(t.indikatorId, t.monitoreringscyklusId),
]);

export const indikatorTiltag = pgTable('indikator_tiltag', {
  id: uuid('id').primaryKey().defaultRandom(),
  indikatorId: uuid('indikator_id').references(() => indikator.id, { onDelete: 'cascade' }).notNull(),
  tiltagId: uuid('tiltag_id').references(() => tiltag.id, { onDelete: 'cascade' }).notNull(),
});

export const indikatorMaal = pgTable('indikator_maal', {
  id: uuid('id').primaryKey().defaultRandom(),
  indikatorId: uuid('indikator_id').references(() => indikator.id, { onDelete: 'cascade' }).notNull(),
  maalId: uuid('maal_id').references(() => maal.id, { onDelete: 'cascade' }).notNull(),
});

export const indikatorIndsatsOmraade = pgTable('indikator_indsats_omraade', {
  id: uuid('id').primaryKey().defaultRandom(),
  indikatorId: uuid('indikator_id').references(() => indikator.id, { onDelete: 'cascade' }).notNull(),
  indsatsOmraadeId: uuid('indsats_omraade_id').references(() => indsatsOmraade.id, { onDelete: 'cascade' }).notNull(),
});
