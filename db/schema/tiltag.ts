import { pgTable, uuid, text, real, boolean, date, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { kommune } from './kommune';
import { indsatsOmraade } from './klimaplan';
import { tiltagStatusEnum, tiltagTypeEnum, befoejelsesKategoriEnum, avoidShiftImproveEnum } from './enums';

export const tiltag = pgTable('tiltag', {
  id: uuid('id').primaryKey().defaultRandom(),
  kommuneId: uuid('kommune_id').references(() => kommune.id, { onDelete: 'cascade' }).notNull(),
  indsatsOmraadeId: uuid('indsats_omraade_id').references(() => indsatsOmraade.id).notNull(),
  titel: text('titel').notNull(),
  beskrivelse: text('beskrivelse'),
  type: tiltagTypeEnum('type').notNull(),
  tidsrammeStart: date('tidsramme_start'),
  tidsrammeSlut: date('tidsramme_slut'),
  ansvarligOrganisation: text('ansvarlig_organisation'),
  forventetEffektCo2Ton: real('forventet_effekt_co2_ton'),
  forventetEffektKvalitativ: text('forventet_effekt_kvalitativ'),
  status: tiltagStatusEnum('status').notNull().default('planned'),
  prioriteretTiltag: boolean('prioriteret_tiltag').notNull().default(false),
  befoejelsesKategori: befoejelsesKategoriEnum('befojelses_kategori'),
  avoidShiftImprove: avoidShiftImproveEnum('avoid_shift_improve'),
  forbrugKategori: text('forbrug_kategori'),
  retfaerdigFordelingRelevant: boolean('retfaerdig_fordeling_relevant').notNull().default(false),
  udfaserFossileBraendsler: boolean('udfaser_fossile_braendsler').notNull().default(false),
  understoettendeTiltag: text('understoettende_tiltag'),
  implementeringsplan: text('implementeringsplan'),
  milepael: jsonb('milepael'),
  omkostningerDetaljeret: text('omkostninger_detaljeret'),
  finansieringstilgang: text('finansieringstilgang'),
  fordelingGevinsterByrder: text('fordeling_gevinster_byrder'),
  kommunikationsplan: text('kommunikationsplan'),
  barrierer: text('barrierer'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tiltagEffekt = pgTable('tiltag_effekt', {
  id: uuid('id').primaryKey().defaultRandom(),
  tiltagId: uuid('tiltag_id').references(() => tiltag.id, { onDelete: 'cascade' }).notNull(),
  kategori: text('kategori'),
  vaerdi: real('vaerdi'),
  enhed: text('enhed'),
  beskrivelse: text('beskrivelse'),
  sortering: integer('sortering').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
