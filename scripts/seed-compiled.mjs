var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// db/schema/enums.ts
import { pgEnum } from "drizzle-orm/pg-core";
var tiltagStatusEnum, tiltagTypeEnum, indsatsTypeEnum, sektorEnum, maalTypeEnum, tidsrammeEnum, maalKategoriEnum, befoejelsesKategoriEnum, avoidShiftImproveEnum, indikatorNiveauEnum, datakildeTypeEnum, apiKildeEnum, aktoerTypeEnum, gruppeTagEnum, saarbarGruppeKategoriEnum, klimafareTypeEnum, severityEnum, scenarieTypeEnum, dokumentationsstyrkeEnum, kriterieStatusEnum, auditActionEnum, importJobStatusEnum, laeringsBeslutningEnum, laeringsKnytningEnum, monitoreringsTypeEnum, monitoreringsStatusEnum;
var init_enums = __esm({
  "db/schema/enums.ts"() {
    "use strict";
    tiltagStatusEnum = pgEnum("tiltag_status", [
      "planned",
      "in_progress",
      "completed",
      "discontinued"
    ]);
    tiltagTypeEnum = pgEnum("tiltag_type", [
      "reduction",
      "adaptation",
      "both"
    ]);
    indsatsTypeEnum = pgEnum("indsats_type", [
      "ghg_reduction",
      "adaptation",
      "consumption",
      "just_transition",
      "cross_cutting"
    ]);
    sektorEnum = pgEnum("sektor", [
      "energy",
      "transport",
      "buildings",
      "food",
      "agriculture",
      "waste",
      "adaptation",
      "other"
    ]);
    maalTypeEnum = pgEnum("maal_type", ["smart", "qualitative"]);
    tidsrammeEnum = pgEnum("tidsramme", ["short", "medium", "long"]);
    maalKategoriEnum = pgEnum("maal_kategori", [
      "reduction",
      "adaptation",
      "co_benefits",
      "consumption"
    ]);
    befoejelsesKategoriEnum = pgEnum("befojelses_kategori", [
      "enterprise",
      "supplier",
      "authority",
      "facilitator"
    ]);
    avoidShiftImproveEnum = pgEnum("avoid_shift_improve", [
      "avoid",
      "shift",
      "improve"
    ]);
    indikatorNiveauEnum = pgEnum("indikator_niveau", [
      "output",
      "outcome",
      "impact"
    ]);
    datakildeTypeEnum = pgEnum("datakilde_type", ["manual", "api"]);
    apiKildeEnum = pgEnum("api_kilde", [
      "klimaregnskab",
      "energidataservice",
      "bbr",
      "dst",
      "klimaatlas",
      "kamp",
      "hip"
    ]);
    aktoerTypeEnum = pgEnum("aktoer_type", [
      "internal",
      "external",
      "citizen",
      "business",
      "utility",
      "civil_society",
      "political"
    ]);
    gruppeTagEnum = pgEnum("gruppe_tag", [
      "affected_by_climate_change",
      "affected_by_climate_action",
      "has_power_influence"
    ]);
    saarbarGruppeKategoriEnum = pgEnum("saarbar_gruppe_kategori", [
      "low_income",
      "elderly",
      "children",
      "disability",
      "ethnicity",
      "geography",
      "other"
    ]);
    klimafareTypeEnum = pgEnum("klimafare_type", [
      "flooding",
      "drought",
      "heat",
      "storm",
      "sea_level_rise",
      "groundwater",
      "other"
    ]);
    severityEnum = pgEnum("severity", ["low", "medium", "high"]);
    scenarieTypeEnum = pgEnum("scenarie_type", ["bau", "action"]);
    dokumentationsstyrkeEnum = pgEnum("dokumentationsstyrke", ["primary", "secondary"]);
    kriterieStatusEnum = pgEnum("kriterie_status", ["complete", "partial", "missing"]);
    auditActionEnum = pgEnum("audit_action", ["create", "update", "delete"]);
    importJobStatusEnum = pgEnum("import_job_status", [
      "pending",
      "processing",
      "complete",
      "failed"
    ]);
    laeringsBeslutningEnum = pgEnum("laerings_beslutning", [
      "viderefoeres",
      "justeres",
      "udgaar",
      "tilfoeres_ressourcer",
      "eskaleres"
    ]);
    laeringsKnytningEnum = pgEnum("laerings_knytning", [
      "tiltag",
      "indsatsomraade",
      "maal"
    ]);
    monitoreringsTypeEnum = pgEnum("monitorerings_type", [
      "aarlig",
      "kvartal",
      "ad_hoc"
    ]);
    monitoreringsStatusEnum = pgEnum("monitorerings_status", [
      "aaben",
      "lukket",
      "rapporteret"
    ]);
  }
});

// db/schema/kommune.ts
import { pgTable, uuid, text, integer, real, date, timestamp, boolean } from "drizzle-orm/pg-core";
var kommune;
var init_kommune = __esm({
  "db/schema/kommune.ts"() {
    "use strict";
    kommune = pgTable("kommune", {
      id: uuid("id").primaryKey().defaultRandom(),
      kommunekode: text("kommunekode").notNull().unique(),
      navn: text("navn").notNull(),
      befolkningstal: integer("befolkningstal"),
      arealKm2: real("areal_km2"),
      klimakommitmentDato: date("klimakommitment_dato"),
      klimakommitmentTekst: text("klimakommitment_tekst"),
      recertificeringsdato: date("recertificeringsdato"),
      logoUrl: text("logo_url"),
      primaryColor: text("primary_color"),
      secondaryColor: text("secondary_color"),
      fontFamily: text("font_family"),
      subdomain: text("subdomain").notNull().unique(),
      publicEnabled: boolean("public_enabled").notNull().default(false),
      publicStaleDays: integer("public_stale_days"),
      publicHighlights: text("public_highlights").array(),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// db/schema/auth.ts
import { pgTable as pgTable2, uuid as uuid2, text as text2, timestamp as timestamp2, boolean as boolean2 } from "drizzle-orm/pg-core";
var user, session, magicLink;
var init_auth = __esm({
  "db/schema/auth.ts"() {
    "use strict";
    init_kommune();
    user = pgTable2("user", {
      id: uuid2("id").primaryKey().defaultRandom(),
      kommuneId: uuid2("kommune_id").references(() => kommune.id),
      email: text2("email").notNull().unique(),
      passwordHash: text2("password_hash"),
      navn: text2("navn").notNull(),
      role: text2("role").notNull().default("koordinator"),
      createdAt: timestamp2("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp2("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    session = pgTable2("session", {
      id: uuid2("id").primaryKey().defaultRandom(),
      userId: uuid2("user_id").references(() => user.id, { onDelete: "cascade" }).notNull(),
      token: text2("token").notNull().unique(),
      expiresAt: timestamp2("expires_at", { withTimezone: true }).notNull(),
      createdAt: timestamp2("created_at", { withTimezone: true }).defaultNow().notNull()
    });
    magicLink = pgTable2("magic_link", {
      id: uuid2("id").primaryKey().defaultRandom(),
      tokenHash: text2("token_hash").notNull().unique(),
      tovholderId: uuid2("tovholder_id").notNull(),
      expiresAt: timestamp2("expires_at", { withTimezone: true }).notNull(),
      used: boolean2("used").notNull().default(false),
      createdAt: timestamp2("created_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// db/schema/klimaplan.ts
import { pgTable as pgTable3, uuid as uuid3, text as text3, integer as integer2, real as real2, boolean as boolean3, timestamp as timestamp3 } from "drizzle-orm/pg-core";
var indsatsOmraade, maal;
var init_klimaplan = __esm({
  "db/schema/klimaplan.ts"() {
    "use strict";
    init_kommune();
    init_enums();
    indsatsOmraade = pgTable3("indsats_omraade", {
      id: uuid3("id").primaryKey().defaultRandom(),
      kommuneId: uuid3("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      navn: text3("navn").notNull(),
      type: indsatsTypeEnum("type").notNull(),
      sektor: sektorEnum("sektor").notNull(),
      forbrugskategoriTag: text3("forbrugskategori_tag"),
      ansvarligForvaltning: text3("ansvarlig_forvaltning"),
      beskrivelse: text3("beskrivelse"),
      aktiv: boolean3("aktiv").notNull().default(true),
      createdAt: timestamp3("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp3("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    maal = pgTable3("maal", {
      id: uuid3("id").primaryKey().defaultRandom(),
      indsatsOmraadeId: uuid3("indsats_omraade_id").references(() => indsatsOmraade.id, { onDelete: "cascade" }).notNull(),
      type: maalTypeEnum("type").notNull(),
      tidsramme: tidsrammeEnum("tidsramme").notNull(),
      maalAar: integer2("maal_aar"),
      maalVaerdi: real2("maal_vaerdi"),
      enhed: text3("enhed"),
      baselineVaerdi: real2("baseline_vaerdi"),
      baselineAar: integer2("baseline_aar"),
      beskrivelse: text3("beskrivelse").notNull(),
      kategori: maalKategoriEnum("kategori").notNull(),
      createdAt: timestamp3("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp3("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// db/schema/tiltag.ts
import { pgTable as pgTable4, uuid as uuid4, text as text4, real as real3, boolean as boolean4, date as date2, timestamp as timestamp4, jsonb } from "drizzle-orm/pg-core";
var tiltag;
var init_tiltag = __esm({
  "db/schema/tiltag.ts"() {
    "use strict";
    init_kommune();
    init_klimaplan();
    init_enums();
    tiltag = pgTable4("tiltag", {
      id: uuid4("id").primaryKey().defaultRandom(),
      kommuneId: uuid4("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      indsatsOmraadeId: uuid4("indsats_omraade_id").references(() => indsatsOmraade.id).notNull(),
      titel: text4("titel").notNull(),
      beskrivelse: text4("beskrivelse"),
      type: tiltagTypeEnum("type").notNull(),
      tidsrammeStart: date2("tidsramme_start"),
      tidsrammeSlut: date2("tidsramme_slut"),
      ansvarligOrganisation: text4("ansvarlig_organisation"),
      forventetEffektCo2Ton: real3("forventet_effekt_co2_ton"),
      forventetEffektKvalitativ: text4("forventet_effekt_kvalitativ"),
      status: tiltagStatusEnum("status").notNull().default("planned"),
      prioriteretTiltag: boolean4("prioriteret_tiltag").notNull().default(false),
      befoejelsesKategori: befoejelsesKategoriEnum("befojelses_kategori"),
      avoidShiftImprove: avoidShiftImproveEnum("avoid_shift_improve"),
      forbrugKategori: text4("forbrug_kategori"),
      retfaerdigFordelingRelevant: boolean4("retfaerdig_fordeling_relevant").notNull().default(false),
      udfaserFossileBraendsler: boolean4("udfaser_fossile_braendsler").notNull().default(false),
      understoettendeTiltag: text4("understoettende_tiltag"),
      implementeringsplan: text4("implementeringsplan"),
      milepael: jsonb("milepael"),
      omkostningerDetaljeret: text4("omkostninger_detaljeret"),
      finansieringstilgang: text4("finansieringstilgang"),
      fordelingGevinsterByrder: text4("fordeling_gevinster_byrder"),
      kommunikationsplan: text4("kommunikationsplan"),
      barrierer: text4("barrierer"),
      createdAt: timestamp4("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp4("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// db/schema/tovholder.ts
import { pgTable as pgTable5, uuid as uuid5, text as text5, boolean as boolean5, date as date3, timestamp as timestamp5 } from "drizzle-orm/pg-core";
var tovholder, tovholderTiltag, tovholderRapport;
var init_tovholder = __esm({
  "db/schema/tovholder.ts"() {
    "use strict";
    init_kommune();
    init_tiltag();
    tovholder = pgTable5("tovholder", {
      id: uuid5("id").primaryKey().defaultRandom(),
      kommuneId: uuid5("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      navn: text5("navn").notNull(),
      forvaltning: text5("forvaltning"),
      email: text5("email").notNull(),
      aktiv: boolean5("aktiv").notNull().default(true),
      createdAt: timestamp5("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp5("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    tovholderTiltag = pgTable5("tovholder_tiltag", {
      id: uuid5("id").primaryKey().defaultRandom(),
      tovholderId: uuid5("tovholder_id").references(() => tovholder.id, { onDelete: "cascade" }).notNull(),
      tiltagId: uuid5("tiltag_id").references(() => tiltag.id, { onDelete: "cascade" }).notNull()
    });
    tovholderRapport = pgTable5("tovholder_rapport", {
      id: uuid5("id").primaryKey().defaultRandom(),
      tovholderId: uuid5("tovholder_id").references(() => tovholder.id, { onDelete: "cascade" }).notNull(),
      tiltagId: uuid5("tiltag_id").references(() => tiltag.id, { onDelete: "cascade" }).notNull(),
      dato: date3("dato").notNull(),
      statusImplementering: text5("status_implementering"),
      statusBeskrivelse: text5("status_beskrivelse"),
      barrierer: text5("barrierer"),
      naesteSkrid: text5("naeste_skridt"),
      effektRealiseret: text5("effekt_realiseret"),
      createdAt: timestamp5("created_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// db/schema/monitorering.ts
import { pgTable as pgTable6, uuid as uuid6, text as text6, integer as integer3, date as date4, timestamp as timestamp6, unique } from "drizzle-orm/pg-core";
var monitoreringscyklus;
var init_monitorering = __esm({
  "db/schema/monitorering.ts"() {
    "use strict";
    init_kommune();
    init_enums();
    monitoreringscyklus = pgTable6("monitoreringscyklus", {
      id: uuid6("id").primaryKey().defaultRandom(),
      kommuneId: uuid6("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      navn: text6("navn").notNull(),
      periodeStart: date4("periode_start"),
      periodeSlut: date4("periode_slut"),
      type: monitoreringsTypeEnum("type").notNull(),
      aar: integer3("aar"),
      status: monitoreringsStatusEnum("status").notNull().default("aaben"),
      createdAt: timestamp6("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp6("updated_at", { withTimezone: true }).defaultNow().notNull()
    }, (t) => [
      unique("monitoreringscyklus_kommune_type_aar_unique").on(t.kommuneId, t.type, t.aar)
    ]);
  }
});

// db/schema/indikator.ts
import { pgTable as pgTable7, uuid as uuid7, text as text7, real as real4, integer as integer4, boolean as boolean6, date as date5, timestamp as timestamp7, unique as unique2 } from "drizzle-orm/pg-core";
var indikator, indikatorMaaling, indikatorTiltag, indikatorMaal, indikatorIndsatsOmraade;
var init_indikator = __esm({
  "db/schema/indikator.ts"() {
    "use strict";
    init_enums();
    init_tiltag();
    init_klimaplan();
    init_monitorering();
    indikator = pgTable7("indikator", {
      id: uuid7("id").primaryKey().defaultRandom(),
      niveau: indikatorNiveauEnum("niveau").notNull(),
      beskrivelse: text7("beskrivelse").notNull(),
      enhed: text7("enhed"),
      datakildeType: datakildeTypeEnum("datakilde_type").notNull(),
      apiKilde: apiKildeEnum("api_kilde"),
      apiQuery: text7("api_query"),
      aggregeringsformel: text7("aggregeringsformel"),
      createdAt: timestamp7("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp7("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    indikatorMaaling = pgTable7("indikator_maaling", {
      id: uuid7("id").primaryKey().defaultRandom(),
      indikatorId: uuid7("indikator_id").references(() => indikator.id, { onDelete: "cascade" }).notNull(),
      monitoreringscyklusId: uuid7("monitoreringscyklus_id").references(() => monitoreringscyklus.id, { onDelete: "cascade" }).notNull(),
      dato: date5("dato"),
      aar: integer4("aar"),
      vaerdi: real4("vaerdi").notNull(),
      kilde: text7("kilde"),
      bemaerkning: text7("bemaerkning"),
      autoHentet: boolean6("auto_hentet").notNull().default(false),
      createdAt: timestamp7("created_at", { withTimezone: true }).defaultNow().notNull()
    }, (t) => [
      unique2("indikator_maaling_indikator_cyklus_unique").on(t.indikatorId, t.monitoreringscyklusId)
    ]);
    indikatorTiltag = pgTable7("indikator_tiltag", {
      id: uuid7("id").primaryKey().defaultRandom(),
      indikatorId: uuid7("indikator_id").references(() => indikator.id, { onDelete: "cascade" }).notNull(),
      tiltagId: uuid7("tiltag_id").references(() => tiltag.id, { onDelete: "cascade" }).notNull()
    });
    indikatorMaal = pgTable7("indikator_maal", {
      id: uuid7("id").primaryKey().defaultRandom(),
      indikatorId: uuid7("indikator_id").references(() => indikator.id, { onDelete: "cascade" }).notNull(),
      maalId: uuid7("maal_id").references(() => maal.id, { onDelete: "cascade" }).notNull()
    });
    indikatorIndsatsOmraade = pgTable7("indikator_indsats_omraade", {
      id: uuid7("id").primaryKey().defaultRandom(),
      indikatorId: uuid7("indikator_id").references(() => indikator.id, { onDelete: "cascade" }).notNull(),
      indsatsOmraadeId: uuid7("indsats_omraade_id").references(() => indsatsOmraade.id, { onDelete: "cascade" }).notNull()
    });
  }
});

// db/schema/vidensgrundlag.ts
import { pgTable as pgTable8, uuid as uuid8, text as text8, timestamp as timestamp8, jsonb as jsonb2 } from "drizzle-orm/pg-core";
var klimafare, konsekvensvurdering, aktoer, aktoerGruppeTag, saarbarGruppe, saarbarGruppeKlimafare, saarbarGruppeIndsatsOmraade;
var init_vidensgrundlag = __esm({
  "db/schema/vidensgrundlag.ts"() {
    "use strict";
    init_kommune();
    init_klimaplan();
    init_enums();
    klimafare = pgTable8("klimafare", {
      id: uuid8("id").primaryKey().defaultRandom(),
      kommuneId: uuid8("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      type: klimafareTypeEnum("type").notNull(),
      sandsynlighed: text8("sandsynlighed"),
      hyppighed: text8("hyppighed"),
      intensitet: text8("intensitet"),
      tidsskala: text8("tidsskala"),
      rumligFordelingGeometri: jsonb2("rumlig_fordeling_geometri"),
      datakilde: text8("datakilde"),
      dataDato: text8("data_dato"),
      dataVersion: text8("data_version"),
      createdAt: timestamp8("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp8("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    konsekvensvurdering = pgTable8("konsekvensvurdering", {
      id: uuid8("id").primaryKey().defaultRandom(),
      klimafareId: uuid8("klimafare_id").references(() => klimafare.id, { onDelete: "cascade" }).notNull(),
      beroertKategori: text8("beroert_kategori").notNull(),
      beroertId: uuid8("beroert_id"),
      konsekvensBeskrivelse: text8("konsekvens_beskrivelse"),
      alvor: severityEnum("alvor"),
      tilpasningskapacitet: severityEnum("tilpasningskapacitet"),
      createdAt: timestamp8("created_at", { withTimezone: true }).defaultNow().notNull()
    });
    aktoer = pgTable8("aktoer", {
      id: uuid8("id").primaryKey().defaultRandom(),
      kommuneId: uuid8("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      navn: text8("navn").notNull(),
      type: aktoerTypeEnum("type").notNull(),
      inddragelsesform: text8("inddragelsesform"),
      inddragelsesfrekvens: text8("inddragelsesfrekvens"),
      paavirkningPaaPlanTekst: text8("paavirkning_paa_plan_tekst"),
      createdAt: timestamp8("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp8("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    aktoerGruppeTag = pgTable8("aktoer_gruppe_tag", {
      id: uuid8("id").primaryKey().defaultRandom(),
      aktoerId: uuid8("aktoer_id").references(() => aktoer.id, { onDelete: "cascade" }).notNull(),
      gruppeTag: gruppeTagEnum("gruppe_tag").notNull()
    });
    saarbarGruppe = pgTable8("saarbar_gruppe", {
      id: uuid8("id").primaryKey().defaultRandom(),
      kommuneId: uuid8("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      gruppeKategori: saarbarGruppeKategoriEnum("gruppe_kategori").notNull(),
      beskrivelse: text8("beskrivelse"),
      vidensgrundlagKilde: text8("vidensgrundlag_kilde"),
      createdAt: timestamp8("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp8("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    saarbarGruppeKlimafare = pgTable8("saarbar_gruppe_klimafare", {
      id: uuid8("id").primaryKey().defaultRandom(),
      saarbarGruppeId: uuid8("saarbar_gruppe_id").references(() => saarbarGruppe.id, { onDelete: "cascade" }).notNull(),
      klimafareId: uuid8("klimafare_id").references(() => klimafare.id, { onDelete: "cascade" }).notNull()
    });
    saarbarGruppeIndsatsOmraade = pgTable8("saarbar_gruppe_indsats_omraade", {
      id: uuid8("id").primaryKey().defaultRandom(),
      saarbarGruppeId: uuid8("saarbar_gruppe_id").references(() => saarbarGruppe.id, { onDelete: "cascade" }).notNull(),
      indsatsOmraadeId: uuid8("indsats_omraade_id").references(() => indsatsOmraade.id, { onDelete: "cascade" }).notNull()
    });
  }
});

// db/schema/regnskab.ts
import { pgTable as pgTable9, uuid as uuid9, text as text9, integer as integer5, real as real5, boolean as boolean7, timestamp as timestamp9 } from "drizzle-orm/pg-core";
var drivhusgasregnskabPost, scenariePost, befoejelsesVurdering;
var init_regnskab = __esm({
  "db/schema/regnskab.ts"() {
    "use strict";
    init_kommune();
    init_klimaplan();
    init_tiltag();
    init_enums();
    drivhusgasregnskabPost = pgTable9("drivhusgasregnskab_post", {
      id: uuid9("id").primaryKey().defaultRandom(),
      kommuneId: uuid9("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      aar: integer5("aar").notNull(),
      gpcSektor: text9("gpc_sektor").notNull(),
      udledningTonCo2e: real5("udledning_ton_co2e").notNull(),
      datakilde: text9("datakilde"),
      gpcKompatibel: boolean7("gpc_kompatibel").notNull().default(true),
      metodeversion: text9("metodeversion"),
      createdAt: timestamp9("created_at", { withTimezone: true }).defaultNow().notNull()
    });
    scenariePost = pgTable9("scenarie_post", {
      id: uuid9("id").primaryKey().defaultRandom(),
      kommuneId: uuid9("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      scenarieType: scenarieTypeEnum("scenarie_type").notNull(),
      aar: integer5("aar").notNull(),
      sektor: text9("sektor"),
      udledningTonCo2e: real5("udledning_ton_co2e").notNull(),
      metodeBeskrivelse: text9("metode_beskrivelse"),
      tiltagId: uuid9("tiltag_id").references(() => tiltag.id),
      createdAt: timestamp9("created_at", { withTimezone: true }).defaultNow().notNull()
    });
    befoejelsesVurdering = pgTable9("befojelses_vurdering", {
      id: uuid9("id").primaryKey().defaultRandom(),
      kommuneId: uuid9("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      indsatsOmraadeId: uuid9("indsats_omraade_id").references(() => indsatsOmraade.id).notNull(),
      rolle: befoejelsesKategoriEnum("rolle").notNull(),
      aktiveTiltagCount: integer5("aktive_tiltag_count"),
      udnyttelsesvurderingTekst: text9("udnyttelsesvurdering_tekst"),
      manglerTekst: text9("mangler_tekst"),
      dato: text9("dato"),
      createdAt: timestamp9("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp9("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// db/schema/cctf.ts
import { pgTable as pgTable10, uuid as uuid10, text as text10, integer as integer6, boolean as boolean8, timestamp as timestamp10, jsonb as jsonb3 } from "drizzle-orm/pg-core";
var cctfKriterie, cctfKriterieMapping, selvevaluering;
var init_cctf = __esm({
  "db/schema/cctf.ts"() {
    "use strict";
    init_kommune();
    init_enums();
    cctfKriterie = pgTable10("cctf_kriterie", {
      id: uuid10("id").primaryKey().defaultRandom(),
      version: text10("version").notNull(),
      kriterieNr: integer6("kriterie_nr").notNull(),
      komponent: text10("komponent").notNull(),
      titel: text10("titel").notNull(),
      beskrivelse: text10("beskrivelse").notNull(),
      krav: jsonb3("krav"),
      aktiv: boolean8("aktiv").notNull().default(true),
      createdAt: timestamp10("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp10("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    cctfKriterieMapping = pgTable10("cctf_kriterie_mapping", {
      id: uuid10("id").primaryKey().defaultRandom(),
      entitetType: text10("entitet_type").notNull(),
      entitetId: uuid10("entitet_id").notNull(),
      kriterieNr: integer6("kriterie_nr").notNull(),
      dokumentationsstyrke: dokumentationsstyrkeEnum("dokumentationsstyrke").notNull().default("primary"),
      bemaerkning: text10("bemaerkning"),
      createdAt: timestamp10("created_at", { withTimezone: true }).defaultNow().notNull()
    });
    selvevaluering = pgTable10("selvevaluering", {
      id: uuid10("id").primaryKey().defaultRandom(),
      kommuneId: uuid10("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      cctfVersion: text10("cctf_version").notNull(),
      version: integer6("version").notNull().default(1),
      genereretDato: timestamp10("genereret_dato", { withTimezone: true }).defaultNow().notNull(),
      godkendtAf: uuid10("godkendt_af"),
      godkendelsesdato: timestamp10("godkendelsesdato", { withTimezone: true }),
      kriterieData: jsonb3("kriterie_data").notNull(),
      createdAt: timestamp10("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp10("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// db/schema/audit.ts
import { pgTable as pgTable11, uuid as uuid11, text as text11, timestamp as timestamp11, jsonb as jsonb4 } from "drizzle-orm/pg-core";
var auditEvent;
var init_audit = __esm({
  "db/schema/audit.ts"() {
    "use strict";
    init_enums();
    auditEvent = pgTable11("audit_event", {
      id: uuid11("id").primaryKey().defaultRandom(),
      userId: uuid11("user_id"),
      entitetType: text11("entitet_type").notNull(),
      entitetId: uuid11("entitet_id").notNull(),
      action: auditActionEnum("action").notNull(),
      beforeState: jsonb4("before_state"),
      afterState: jsonb4("after_state"),
      ipAddress: text11("ip_address"),
      timestamp: timestamp11("timestamp", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// db/schema/indikator-template.ts
import { pgTable as pgTable12, uuid as uuid12, text as text12, boolean as boolean9, integer as integer7, timestamp as timestamp12, unique as unique3 } from "drizzle-orm/pg-core";
var indikatorTemplate, kommuneIndikator;
var init_indikator_template = __esm({
  "db/schema/indikator-template.ts"() {
    "use strict";
    init_enums();
    init_kommune();
    init_indikator();
    indikatorTemplate = pgTable12("indikator_template", {
      id: uuid12("id").primaryKey().defaultRandom(),
      titel: text12("titel").notNull(),
      kilde: apiKildeEnum("kilde").notNull(),
      apiQuery: text12("api_query").notNull(),
      enhed: text12("enhed").notNull(),
      beskrivelse: text12("beskrivelse").notNull(),
      cctfKriterier: integer7("cctf_kriterier").array().notNull().default([]),
      aktiv: boolean9("aktiv").notNull().default(true),
      createdAt: timestamp12("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp12("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
    kommuneIndikator = pgTable12("kommune_indikator", {
      id: uuid12("id").primaryKey().defaultRandom(),
      kommuneId: uuid12("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      templateId: uuid12("template_id").references(() => indikatorTemplate.id, { onDelete: "restrict" }).notNull(),
      indikatorId: uuid12("indikator_id").references(() => indikator.id, { onDelete: "restrict" }).notNull(),
      visningsnavn: text12("visningsnavn"),
      aktiv: boolean9("aktiv").notNull().default(true),
      sidstHentet: timestamp12("sidst_hentet", { withTimezone: true }),
      sidsteFejl: timestamp12("sidste_fejl", { withTimezone: true }),
      sidsteFejlBesked: text12("sidste_fejl_besked"),
      createdAt: timestamp12("created_at", { withTimezone: true }).defaultNow().notNull()
    }, (t) => [
      unique3("kommune_indikator_kommune_template_unique").on(t.kommuneId, t.templateId)
    ]);
  }
});

// db/schema/import-job.ts
import { pgTable as pgTable13, uuid as uuid13, text as text13, timestamp as timestamp13, jsonb as jsonb5 } from "drizzle-orm/pg-core";
var importJob;
var init_import_job = __esm({
  "db/schema/import-job.ts"() {
    "use strict";
    init_kommune();
    init_enums();
    importJob = pgTable13("import_job", {
      id: uuid13("id").primaryKey().defaultRandom(),
      kommuneId: uuid13("kommune_id").notNull().references(() => kommune.id, { onDelete: "cascade" }),
      filnavn: text13("filnavn").notNull(),
      filtype: text13("filtype").notNull(),
      filindhold: text13("filindhold").notNull(),
      status: importJobStatusEnum("status").notNull().default("pending"),
      resultat: jsonb5("resultat"),
      fejl: text13("fejl"),
      oprettet: timestamp13("oprettet", { withTimezone: true }).defaultNow().notNull(),
      opdateret: timestamp13("opdateret", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// db/schema/laeringspost.ts
import { pgTable as pgTable14, uuid as uuid14, text as text14, date as date6, timestamp as timestamp14 } from "drizzle-orm/pg-core";
var laeringspost;
var init_laeringspost = __esm({
  "db/schema/laeringspost.ts"() {
    "use strict";
    init_kommune();
    init_tovholder();
    init_enums();
    laeringspost = pgTable14("laeringspost", {
      id: uuid14("id").primaryKey().defaultRandom(),
      kommuneId: uuid14("kommune_id").references(() => kommune.id, { onDelete: "cascade" }).notNull(),
      // Polymorf kobling — ingen FK, valideres i applikationslaget.
      knyttetTilType: laeringsKnytningEnum("knyttet_til_type").notNull(),
      knyttetTilId: uuid14("knyttet_til_id").notNull(),
      observation: text14("observation").notNull(),
      fortolkning: text14("fortolkning"),
      beslutning: laeringsBeslutningEnum("beslutning").notNull(),
      beslutningstager: text14("beslutningstager"),
      dato: date6("dato").notNull(),
      // Reference til den rapport der udløste læringen (nullable).
      tovholderRapportId: uuid14("tovholder_rapport_id").references(() => tovholderRapport.id, { onDelete: "set null" }),
      createdAt: timestamp14("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp14("updated_at", { withTimezone: true }).defaultNow().notNull()
    });
  }
});

// db/schema/index.ts
var schema_exports = {};
__export(schema_exports, {
  aktoer: () => aktoer,
  aktoerGruppeTag: () => aktoerGruppeTag,
  aktoerTypeEnum: () => aktoerTypeEnum,
  apiKildeEnum: () => apiKildeEnum,
  auditActionEnum: () => auditActionEnum,
  auditEvent: () => auditEvent,
  avoidShiftImproveEnum: () => avoidShiftImproveEnum,
  befoejelsesKategoriEnum: () => befoejelsesKategoriEnum,
  befoejelsesVurdering: () => befoejelsesVurdering,
  cctfKriterie: () => cctfKriterie,
  cctfKriterieMapping: () => cctfKriterieMapping,
  datakildeTypeEnum: () => datakildeTypeEnum,
  dokumentationsstyrkeEnum: () => dokumentationsstyrkeEnum,
  drivhusgasregnskabPost: () => drivhusgasregnskabPost,
  gruppeTagEnum: () => gruppeTagEnum,
  importJob: () => importJob,
  importJobStatusEnum: () => importJobStatusEnum,
  indikator: () => indikator,
  indikatorIndsatsOmraade: () => indikatorIndsatsOmraade,
  indikatorMaal: () => indikatorMaal,
  indikatorMaaling: () => indikatorMaaling,
  indikatorNiveauEnum: () => indikatorNiveauEnum,
  indikatorTemplate: () => indikatorTemplate,
  indikatorTiltag: () => indikatorTiltag,
  indsatsOmraade: () => indsatsOmraade,
  indsatsTypeEnum: () => indsatsTypeEnum,
  klimafare: () => klimafare,
  klimafareTypeEnum: () => klimafareTypeEnum,
  kommune: () => kommune,
  kommuneIndikator: () => kommuneIndikator,
  konsekvensvurdering: () => konsekvensvurdering,
  kriterieStatusEnum: () => kriterieStatusEnum,
  laeringsBeslutningEnum: () => laeringsBeslutningEnum,
  laeringsKnytningEnum: () => laeringsKnytningEnum,
  laeringspost: () => laeringspost,
  maal: () => maal,
  maalKategoriEnum: () => maalKategoriEnum,
  maalTypeEnum: () => maalTypeEnum,
  magicLink: () => magicLink,
  monitoreringsStatusEnum: () => monitoreringsStatusEnum,
  monitoreringsTypeEnum: () => monitoreringsTypeEnum,
  monitoreringscyklus: () => monitoreringscyklus,
  saarbarGruppe: () => saarbarGruppe,
  saarbarGruppeIndsatsOmraade: () => saarbarGruppeIndsatsOmraade,
  saarbarGruppeKategoriEnum: () => saarbarGruppeKategoriEnum,
  saarbarGruppeKlimafare: () => saarbarGruppeKlimafare,
  scenariePost: () => scenariePost,
  scenarieTypeEnum: () => scenarieTypeEnum,
  sektorEnum: () => sektorEnum,
  selvevaluering: () => selvevaluering,
  session: () => session,
  severityEnum: () => severityEnum,
  tidsrammeEnum: () => tidsrammeEnum,
  tiltag: () => tiltag,
  tiltagStatusEnum: () => tiltagStatusEnum,
  tiltagTypeEnum: () => tiltagTypeEnum,
  tovholder: () => tovholder,
  tovholderRapport: () => tovholderRapport,
  tovholderTiltag: () => tovholderTiltag,
  user: () => user
});
var init_schema = __esm({
  "db/schema/index.ts"() {
    "use strict";
    init_enums();
    init_kommune();
    init_auth();
    init_klimaplan();
    init_tiltag();
    init_tovholder();
    init_indikator();
    init_vidensgrundlag();
    init_regnskab();
    init_cctf();
    init_audit();
    init_indikator_template();
    init_import_job();
    init_laeringspost();
    init_monitorering();
  }
});

// db/seed.ts
init_schema();
import { hash as hash2 } from "@node-rs/argon2";
import { drizzle as drizzle2 } from "drizzle-orm/postgres-js";
import postgres2 from "postgres";

// db/seeds/groenkobing.ts
init_schema();
import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
async function seedGroenkobing() {
  const client2 = postgres(process.env.DATABASE_URL);
  const db2 = drizzle(client2);
  try {
    const existing = await db2.select().from(kommune).where(eq(kommune.kommunekode, "0999")).limit(1);
    if (existing.length > 0) {
      await db2.update(kommune).set({
        publicEnabled: true,
        publicStaleDays: 365,
        publicHighlights: ["Lavbundsarealer udtaget fra omdrift (450 ha)", "Solpark Nordmark under etablering (85 MW)", "Alle kommunale oliefyr udfaset"]
      }).where(eq(kommune.kommunekode, "0999"));
      console.log("Gr\xF8nk\xF8bing Kommune: konfiguration opdateret.");
      return;
    }
    console.log("Seeder Gr\xF8nk\xF8bing Kommune...");
    const [groenkobing] = await db2.insert(kommune).values({
      kommunekode: "0999",
      navn: "Gr\xF8nk\xF8bing Kommune",
      befolkningstal: 51200,
      arealKm2: 1085,
      klimakommitmentDato: "2021-06-01",
      klimakommitmentTekst: "Gr\xF8nk\xF8bing Kommune forpligter sig til at opn\xE5 70% CO\u2082e-reduktion inden 2030 og klimaneutralitet inden 2045 i overensstemmelse med Parisaftalens 1,5\xB0C-ambition.",
      primaryColor: "#1a5c38",
      secondaryColor: "#e8f5e9",
      subdomain: "groenkobing",
      publicEnabled: true,
      publicStaleDays: 365,
      publicHighlights: ["Lavbundsarealer udtaget fra omdrift (450 ha)", "Solpark Nordmark under etablering (85 MW)", "Alle kommunale oliefyr udfaset"]
    }).returning();
    const passwordHash = await hash(process.env.SEED_PASSWORD ?? "klimastatus2026!");
    await db2.insert(user).values({
      kommuneId: groenkobing.id,
      email: "koordinator@groenkobing.dk",
      passwordHash,
      navn: "Maja Vestergaard",
      role: "koordinator"
    }).onConflictDoNothing();
    const [io1, io2, io3, io4, io5] = await db2.insert(indsatsOmraade).values([
      {
        kommuneId: groenkobing.id,
        navn: "Vedvarende energi og udfasning af fossiler",
        type: "ghg_reduction",
        sektor: "energy",
        ansvarligForvaltning: "Teknik & Milj\xF8",
        beskrivelse: "Udbygning af sol- og vindenergi samt udfasning af fossile br\xE6ndsler i varme- og elproduktion. Sektoren udg\xF8r ca. 11% af kommunens samlede CO\u2082e-udledning.",
        aktiv: true
      },
      {
        kommuneId: groenkobing.id,
        navn: "Transport og mobilitet",
        type: "ghg_reduction",
        sektor: "transport",
        ansvarligForvaltning: "Vej & Park",
        beskrivelse: "Gr\xF8n omstilling af transport med fokus p\xE5 kollektiv trafik, cyklisme og elektrifisering. Transport udg\xF8r ca. 26% af kommunens samlede udledning.",
        aktiv: true
      },
      {
        kommuneId: groenkobing.id,
        navn: "Landbrug, natur og lavbundsarealer",
        type: "ghg_reduction",
        sektor: "agriculture",
        ansvarligForvaltning: "Natur & Landbrug",
        beskrivelse: "Reduktion af landbrugets drivhusgasudledning via udtag af lavbundsarealer, skovrejsning og biogas. Den st\xF8rste sektor med ca. 55% af kommunens samlede CO\u2082e-udledning.",
        aktiv: true
      },
      {
        kommuneId: groenkobing.id,
        navn: "Bygninger og b\xE6redygtigt forbrug",
        type: "cross_cutting",
        sektor: "buildings",
        ansvarligForvaltning: "Ejendomsservice",
        beskrivelse: "Renovering af boliger og kommunale bygninger samt gr\xF8nne indk\xF8b. Udg\xF8r ca. 8% af kommunens samlede udledning.",
        aktiv: true
      },
      {
        kommuneId: groenkobing.id,
        navn: "Klimatilpasning",
        type: "adaptation",
        sektor: "adaptation",
        ansvarligForvaltning: "Teknik & Milj\xF8",
        beskrivelse: "Sikring af kommunen mod stigende klimarisici: oversv\xF8mmelse, ekstremregn, hedeb\xF8lger og t\xF8rke.",
        aktiv: true
      }
    ]).returning();
    const insertedTiltag = await db2.insert(tiltag).values([
      // --- Indsats 1: Vedvarende energi (5 tiltag) ---
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io1.id,
        titel: "Etablering af solpark Nordmark (85 ha)",
        type: "reduction",
        status: "in_progress",
        beskrivelse: "Anl\xE6g af 85 ha solcellepark nord for Gr\xF8nk\xF8bing by. Forventet kapacitet: 85 MW. Samarbejde med lokalt energiselskab.",
        forventetEffektCo2Ton: 42e3,
        tidsrammeStart: "2024-01-01",
        tidsrammeSlut: "2026-12-31",
        ansvarligOrganisation: "Gr\xF8nk\xF8bing Energi A/S",
        barrierer: "Naboklager om landskabsp\xE5virkning. Netkapacitet begr\xE6nset \u2014 afventer Energinet-opgradering.",
        prioriteretTiltag: true,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io1.id,
        titel: "Repowering af \xE6ldre vindm\xF8ller",
        type: "reduction",
        status: "planned",
        beskrivelse: "Udskiftning af 12 \xE6ldre vindm\xF8ller (2\u20133 MW) med moderne m\xF8ller (5+ MW). \xD8ger samlet kapacitet fra ~30 MW til ~65 MW.",
        forventetEffektCo2Ton: 28e3,
        tidsrammeStart: "2026-01-01",
        tidsrammeSlut: "2029-12-31",
        ansvarligOrganisation: "Teknik & Milj\xF8",
        barrierer: "Afventer opdateret kommuneplan. Finansieringsmodel ikke afklaret.",
        prioriteretTiltag: true,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io1.id,
        titel: "Udfasning af oliefyr i kommunale bygninger",
        type: "reduction",
        status: "completed",
        beskrivelse: "Alle 23 kommunale bygninger med oliefyr er overg\xE5et til varmepumpe eller fjernvarme.",
        forventetEffektCo2Ton: 1200,
        tidsrammeStart: "2022-01-01",
        tidsrammeSlut: "2024-06-30",
        ansvarligOrganisation: "Ejendomsservice",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io1.id,
        titel: "Fjernvarmeudvidelse til Gr\xF8nk\xF8bing Vest",
        type: "reduction",
        status: "in_progress",
        beskrivelse: "Udvidelse af fjernvarmenettet til 1.200 boliger i Gr\xF8nk\xF8bing Vest der i dag opvarmes med naturgas.",
        forventetEffektCo2Ton: 8500,
        tidsrammeStart: "2024-06-01",
        tidsrammeSlut: "2027-06-30",
        ansvarligOrganisation: "Gr\xF8nk\xF8bing Energi A/S",
        barrierer: "Gravearbejde forsinket pga. ledningsanl\xE6g. Tilslutningsprocent lavere end forventet.",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io1.id,
        titel: "Power-to-X forunders\xF8gelse med lokalt energiselskab",
        type: "reduction",
        status: "planned",
        beskrivelse: "Forunders\xF8gelse af brintanl\xE6g til lagring og konvertering af overskudsstr\xF8m fra vedvarende energi.",
        tidsrammeStart: "2025-01-01",
        tidsrammeSlut: "2030-12-31",
        ansvarligOrganisation: "Teknik & Milj\xF8",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      // --- Indsats 2: Transport (5 tiltag) ---
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io2.id,
        titel: "El-busser p\xE5 3 kommunale ruter",
        type: "reduction",
        status: "in_progress",
        beskrivelse: "Indk\xF8b og idrifts\xE6ttelse af 8 el-busser p\xE5 de 3 mest trafikerede lokalruter.",
        forventetEffektCo2Ton: 950,
        tidsrammeStart: "2024-01-01",
        tidsrammeSlut: "2025-12-31",
        ansvarligOrganisation: "Vej & Park",
        barrierer: "Levering af busser forsinket 6 m\xE5neder pga. forsyningsproblemer.",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io2.id,
        titel: "Pendlercykelstier (15 km ny infrastruktur)",
        type: "reduction",
        status: "planned",
        beskrivelse: "Anl\xE6g af 15 km forbedrede pendlercykelruter mellem de 3 st\xF8rste bysamfund i kommunen.",
        forventetEffektCo2Ton: 600,
        tidsrammeStart: "2025-01-01",
        tidsrammeSlut: "2028-12-31",
        ansvarligOrganisation: "Vej & Park",
        barrierer: "Jordk\xF8b i forhandling. Finansiering delvis afh\xE6ngig af statslig cykelstipulje.",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io2.id,
        titel: "Kommunal k\xF8ret\xF8jsfl\xE5de 100% el inden 2027",
        type: "reduction",
        status: "in_progress",
        beskrivelse: "Udskiftning af 47 kommunale benzin-/dieselk\xF8ret\xF8jer med elbiler. 22 er udskiftet pr. 2024.",
        forventetEffektCo2Ton: 420,
        tidsrammeStart: "2023-01-01",
        tidsrammeSlut: "2027-12-31",
        ansvarligOrganisation: "Ejendomsservice",
        barrierer: "R\xE6kkevidde utilstr\xE6kkelig til visse tekniske k\xF8ret\xF8jer. Afventer bedre markedstilbud.",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io2.id,
        titel: "Samk\xF8rselsprogram for virksomheder",
        type: "reduction",
        status: "planned",
        beskrivelse: "Etablering af digital samk\xF8rselsplatform i samarbejde med 15 store lokale virksomheder.",
        forventetEffektCo2Ton: 300,
        tidsrammeStart: "2025-01-01",
        tidsrammeSlut: "2027-12-31",
        ansvarligOrganisation: "Vej & Park",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io2.id,
        titel: "Ladestandere p\xE5 kommunale p-pladser (40 stk.)",
        type: "reduction",
        status: "completed",
        beskrivelse: "40 ladestander-punkter opstillet p\xE5 12 kommunale parkeringspladser i kommunen.",
        forventetEffektCo2Ton: 180,
        tidsrammeStart: "2022-06-01",
        tidsrammeSlut: "2023-12-31",
        ansvarligOrganisation: "Vej & Park",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      // --- Indsats 3: Landbrug (5 tiltag) ---
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io3.id,
        titel: "Udtagning af lavbundsarealer (450 ha)",
        type: "reduction",
        status: "in_progress",
        beskrivelse: "Frivillig udtagning af 450 ha lavbundsjord fra omdrift for at reducere metan- og lattergas-udledning fra dr\xE6net t\xF8rv.",
        forventetEffektCo2Ton: 112500,
        tidsrammeStart: "2023-01-01",
        tidsrammeSlut: "2030-12-31",
        ansvarligOrganisation: "Natur & Landbrug",
        barrierer: "Lodsejeraftaler tager tid. Kompensationsniveau opfattes for lavt af mange landm\xE6nd.",
        prioriteretTiltag: true,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io3.id,
        titel: "Klimaskov \u2014 skovrejsning 120 ha",
        type: "reduction",
        status: "planned",
        beskrivelse: "Skovrejsning p\xE5 120 ha landbrugsjord. \xD8ger CO\u2082-optag og styrker biodiversiteten.",
        forventetEffektCo2Ton: 18e3,
        tidsrammeStart: "2025-01-01",
        tidsrammeSlut: "2035-12-31",
        ansvarligOrganisation: "Natur & Landbrug",
        barrierer: "Sv\xE6rt at finde egnede arealer \u2014 landbrugsjord efterspurgt. Statsst\xF8tteans\xF8gning under behandling.",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io3.id,
        titel: "Biogasfacilitet til husdyrg\xF8dning",
        type: "reduction",
        status: "in_progress",
        beskrivelse: "F\xE6lles biogasanl\xE6g for 8 kv\xE6gbrug. Reducerer metan fra g\xF8dningsh\xE5ndtering og erstatter naturgas i fjernvarmen.",
        forventetEffektCo2Ton: 21e3,
        tidsrammeStart: "2024-01-01",
        tidsrammeSlut: "2026-06-30",
        ansvarligOrganisation: "Natur & Landbrug",
        barrierer: "Byggetilladelse forsinket 4 m\xE5neder. En deltager trukket sig.",
        prioriteretTiltag: true,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io3.id,
        titel: "Frivillig oml\xE6gning til vedvarende vegetation",
        type: "reduction",
        status: "planned",
        beskrivelse: "R\xE5dgivningsforl\xF8b og tilskud til landm\xE6nd der oml\xE6gger marginale dyrkningsarealer til vedvarende vegetation.",
        forventetEffektCo2Ton: 8e3,
        tidsrammeStart: "2025-01-01",
        tidsrammeSlut: "2030-12-31",
        ansvarligOrganisation: "Natur & Landbrug",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io3.id,
        titel: "Partnerskab med landboforening om klimavenlig drift",
        type: "reduction",
        status: "in_progress",
        beskrivelse: "Forpligtende partnerskab med \xD8stjyllands Landboforening om klimar\xE5dgivning til 200 lokale landm\xE6nd.",
        forventetEffektCo2Ton: 5e3,
        tidsrammeStart: "2024-01-01",
        tidsrammeSlut: "2030-12-31",
        ansvarligOrganisation: "Natur & Landbrug",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      // --- Indsats 4: Bygninger (4 tiltag) ---
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io4.id,
        titel: "Renoveringspulje til private boliger (5 mio. kr.)",
        type: "reduction",
        status: "in_progress",
        beskrivelse: "Kommunal medfinansieringspulje til energirenovering. St\xF8tter op til 30% af renoveringsomkostninger for lavindkomstboliger.",
        forventetEffektCo2Ton: 4200,
        tidsrammeStart: "2024-01-01",
        tidsrammeSlut: "2026-12-31",
        ansvarligOrganisation: "Ejendomsservice",
        barrierer: "Ans\xF8gningsprocessen opfattes som besv\xE6rlig. Mange ans\xF8gninger udenfor m\xE5lgruppen.",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: true
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io4.id,
        titel: "ESCO-renovering af 8 kommunale skoler",
        type: "reduction",
        status: "completed",
        beskrivelse: "Energioptimering af 8 skoler via ESCO-kontrakt. Opn\xE5et 38% energibesparelse i gennemsnit.",
        forventetEffektCo2Ton: 2100,
        tidsrammeStart: "2021-01-01",
        tidsrammeSlut: "2023-12-31",
        ansvarligOrganisation: "Ejendomsservice",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io4.id,
        titel: "Gr\xF8nne indk\xF8bskrav i kommunens udbud",
        type: "reduction",
        status: "in_progress",
        beskrivelse: "Integration af klimakrav i alle kommunale udbud over 500.000 kr. M\xE5l: 80% af udbud har klimakriterier inden 2026.",
        forventetEffektCo2Ton: 3500,
        tidsrammeStart: "2024-01-01",
        tidsrammeSlut: "2026-12-31",
        ansvarligOrganisation: "Ejendomsservice",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io4.id,
        titel: "Vejledning til borgere om varmepumper",
        type: "reduction",
        status: "planned",
        beskrivelse: "Ops\xF8gende r\xE5dgivning og informationskampagne til 3.000 naturgasbrugere om overgang til varmepumpe.",
        forventetEffektCo2Ton: 6800,
        tidsrammeStart: "2025-01-01",
        tidsrammeSlut: "2028-12-31",
        ansvarligOrganisation: "Teknik & Milj\xF8",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: true,
        retfaerdigFordelingRelevant: false
      },
      // --- Indsats 5: Klimatilpasning (3 tiltag) ---
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io5.id,
        titel: "Klimasikring af Gr\xF8nk\xF8bing \xC5 (oversv\xF8mmelse)",
        type: "adaptation",
        status: "in_progress",
        beskrivelse: "Forh\xF8jelse og forst\xE6rkning af \xE5diger ved Gr\xF8nk\xF8bing \xC5. Sikrer 2.200 boliger mod 100-\xE5rsflod.",
        tidsrammeStart: "2024-06-01",
        tidsrammeSlut: "2027-12-31",
        ansvarligOrganisation: "Gr\xF8nk\xF8bing Energi A/S",
        barrierer: "Koordinering med Kystdirektoratet tager tid. Statslig medfinansiering ikke frigivet endnu.",
        prioriteretTiltag: true,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io5.id,
        titel: "Varmeplan for udsatte boligomr\xE5der",
        type: "adaptation",
        status: "planned",
        beskrivelse: "Kortl\xE6gning og forebyggende indsats i 4 boligomr\xE5der med h\xF8j risiko for hedeb\xF8lgep\xE5virkning.",
        tidsrammeStart: "2025-01-01",
        tidsrammeSlut: "2027-12-31",
        ansvarligOrganisation: "Teknik & Milj\xF8",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: true
      },
      {
        kommuneId: groenkobing.id,
        indsatsOmraadeId: io5.id,
        titel: "Skybrudsplan for bymidten",
        type: "adaptation",
        status: "in_progress",
        beskrivelse: "Anl\xE6g af forsinkelsesbassin og gr\xF8nne friarealer til h\xE5ndtering af ekstremregn i bymidten.",
        tidsrammeStart: "2024-01-01",
        tidsrammeSlut: "2026-12-31",
        ansvarligOrganisation: "Gr\xF8nk\xF8bing Energi A/S",
        barrierer: "Ekspropriering af 2 ejendomme n\xF8dvendig \u2014 klagesag verserer.",
        prioriteretTiltag: false,
        udfaserFossileBraendsler: false,
        retfaerdigFordelingRelevant: false
      }
    ]).returning();
    await db2.insert(maal).values([
      {
        indsatsOmraadeId: io1.id,
        type: "smart",
        tidsramme: "short",
        maalAar: 2030,
        maalVaerdi: 154800,
        enhed: "ton CO\u2082e/\xE5r",
        baselineVaerdi: 516e3,
        baselineAar: 2018,
        beskrivelse: "70% reduktion af kommunens samlede CO\u2082e-udledning ift. 2018-niveau inden 2030 (fra 516.000 til 154.800 ton CO\u2082e/\xE5r). Baseret p\xE5 Herning-profil skaleret til 51.200 indb.",
        kategori: "reduction"
      },
      {
        indsatsOmraadeId: io5.id,
        type: "smart",
        tidsramme: "medium",
        maalAar: 2035,
        maalVaerdi: 60,
        enhed: "% reduktion i klimaskadeomkostninger",
        baselineVaerdi: 100,
        baselineAar: 2020,
        beskrivelse: "Reducere de samlede skadeomkostninger fra klimah\xE6ndelser (oversv\xF8mmelse, hedeb\xF8lge, t\xF8rke) med 60% inden 2035 ift. 2020-niveau.",
        kategori: "adaptation"
      },
      {
        indsatsOmraadeId: io4.id,
        type: "qualitative",
        tidsramme: "long",
        beskrivelse: "Sikre at klimaomstillingen er retf\xE6rdig \u2014 ingen borgere, virksomheder eller lokalsamfund lades uforholdsm\xE6ssigt tilbage. S\xE6rlig opm\xE6rksomhed p\xE5 lavindkomstgrupper og periferomr\xE5der.",
        kategori: "co_benefits"
      }
    ]);
    const [th1, th2, th3, th4, th5] = await db2.insert(tovholder).values([
      {
        kommuneId: groenkobing.id,
        navn: "S\xF8ren Kjeldgaard",
        forvaltning: "Teknik & Milj\xF8",
        email: "skj@groenkobing.dk",
        aktiv: true
      },
      {
        kommuneId: groenkobing.id,
        navn: "Birgitte M\xF8ller",
        forvaltning: "Vej & Park",
        email: "bmo@groenkobing.dk",
        aktiv: true
      },
      {
        kommuneId: groenkobing.id,
        navn: "Hans Erik Christensen",
        forvaltning: "Natur & Landbrug",
        email: "hec@groenkobing.dk",
        aktiv: true
      },
      {
        kommuneId: groenkobing.id,
        navn: "Lene Stubkj\xE6r",
        forvaltning: "Ejendomsservice",
        email: "lst@groenkobing.dk",
        aktiv: true
      },
      {
        kommuneId: groenkobing.id,
        navn: "Gr\xF8nk\xF8bing Energi A/S",
        forvaltning: "Forsyning (ekstern)",
        email: "klima@energigroenkobing.dk",
        aktiv: true
      }
    ]).returning();
    const tovholderLinks = [
      ...insertedTiltag.filter((t) => t.indsatsOmraadeId === io1.id).map((t) => ({ tovholderId: th1.id, tiltagId: t.id })),
      ...insertedTiltag.filter((t) => t.indsatsOmraadeId === io2.id).map((t) => ({ tovholderId: th2.id, tiltagId: t.id })),
      ...insertedTiltag.filter((t) => t.indsatsOmraadeId === io3.id).map((t) => ({ tovholderId: th3.id, tiltagId: t.id })),
      ...insertedTiltag.filter((t) => t.indsatsOmraadeId === io4.id).map((t) => ({ tovholderId: th4.id, tiltagId: t.id })),
      ...insertedTiltag.filter((t) => t.indsatsOmraadeId === io5.id).map((t) => ({ tovholderId: th5.id, tiltagId: t.id }))
    ];
    await db2.insert(tovholderTiltag).values(tovholderLinks);
    const [iCoFjernvarme, iElbiler, iLavbund, iHaendelser] = await db2.insert(indikator).values([
      {
        niveau: "outcome",
        beskrivelse: "Andel af boliger tilsluttet fjernvarme",
        enhed: "%",
        datakildeType: "manual"
      },
      {
        niveau: "output",
        beskrivelse: "Antal registrerede elbiler i kommunen",
        enhed: "antal",
        datakildeType: "manual"
      },
      {
        niveau: "output",
        beskrivelse: "Lavbundsarealer udtaget fra omdrift",
        enhed: "ha",
        datakildeType: "manual"
      },
      {
        niveau: "outcome",
        beskrivelse: "Registrerede klimah\xE6ndelser (oversv\xF8mmelse, ekstremvarme, t\xF8rke)",
        enhed: "antal/\xE5r",
        datakildeType: "manual"
      }
    ]).returning();
    const cyklusRows = await db2.insert(monitoreringscyklus).values(
      [2021, 2022, 2023, 2024].map((aar) => ({
        kommuneId: groenkobing.id,
        aar,
        type: "aarlig",
        navn: `\xC5rsstatus ${aar}`,
        status: "rapporteret"
      }))
    ).onConflictDoNothing().returning();
    const alleCyklusser = cyklusRows.length < 4 ? await db2.select().from(monitoreringscyklus).where(
      and(eq(monitoreringscyklus.kommuneId, groenkobing.id), eq(monitoreringscyklus.type, "aarlig"))
    ) : cyklusRows;
    const cyklusByAar = Object.fromEntries(alleCyklusser.map((c) => [c.aar, c.id]));
    await db2.insert(indikatorMaaling).values([
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2021], aar: 2021, vaerdi: 58, kilde: "Gr\xF8nk\xF8bing Energi A/S \xE5rsrapport" },
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2022], aar: 2022, vaerdi: 61, kilde: "Gr\xF8nk\xF8bing Energi A/S \xE5rsrapport" },
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2023], aar: 2023, vaerdi: 64, kilde: "Gr\xF8nk\xF8bing Energi A/S \xE5rsrapport" },
      { indikatorId: iCoFjernvarme.id, monitoreringscyklusId: cyklusByAar[2024], aar: 2024, vaerdi: 67, kilde: "Gr\xF8nk\xF8bing Energi A/S \xE5rsrapport" },
      { indikatorId: iElbiler.id, monitoreringscyklusId: cyklusByAar[2021], aar: 2021, vaerdi: 312, kilde: "Motorregistret via DST" },
      { indikatorId: iElbiler.id, monitoreringscyklusId: cyklusByAar[2022], aar: 2022, vaerdi: 589, kilde: "Motorregistret via DST" },
      { indikatorId: iElbiler.id, monitoreringscyklusId: cyklusByAar[2023], aar: 2023, vaerdi: 1124, kilde: "Motorregistret via DST" },
      { indikatorId: iElbiler.id, monitoreringscyklusId: cyklusByAar[2024], aar: 2024, vaerdi: 1897, kilde: "Motorregistret via DST" },
      { indikatorId: iLavbund.id, monitoreringscyklusId: cyklusByAar[2023], aar: 2023, vaerdi: 85, kilde: "Natur & Landbrug intern opg\xF8relse" },
      { indikatorId: iLavbund.id, monitoreringscyklusId: cyklusByAar[2024], aar: 2024, vaerdi: 210, kilde: "Natur & Landbrug intern opg\xF8relse" },
      { indikatorId: iHaendelser.id, monitoreringscyklusId: cyklusByAar[2021], aar: 2021, vaerdi: 3, kilde: "Beredskabsrapport" },
      { indikatorId: iHaendelser.id, monitoreringscyklusId: cyklusByAar[2022], aar: 2022, vaerdi: 5, kilde: "Beredskabsrapport" },
      { indikatorId: iHaendelser.id, monitoreringscyklusId: cyklusByAar[2023], aar: 2023, vaerdi: 7, kilde: "Beredskabsrapport" },
      { indikatorId: iHaendelser.id, monitoreringscyklusId: cyklusByAar[2024], aar: 2024, vaerdi: 4, kilde: "Beredskabsrapport" }
    ]).onConflictDoNothing();
    await db2.insert(indikatorIndsatsOmraade).values([
      { indikatorId: iCoFjernvarme.id, indsatsOmraadeId: io1.id },
      { indikatorId: iElbiler.id, indsatsOmraadeId: io2.id },
      { indikatorId: iLavbund.id, indsatsOmraadeId: io3.id },
      { indikatorId: iHaendelser.id, indsatsOmraadeId: io5.id }
    ]);
    const tiltagLavbund = insertedTiltag.find((t) => t.titel.includes("Udtagning af lavbundsarealer"));
    if (tiltagLavbund) {
      await db2.insert(indikatorTiltag).values({ indikatorId: iLavbund.id, tiltagId: tiltagLavbund.id });
    }
    const templates = await db2.select().from(indikatorTemplate).where(eq(indikatorTemplate.aktiv, true));
    for (const template of templates) {
      const [autoInd] = await db2.insert(indikator).values({
        niveau: "impact",
        beskrivelse: template.titel,
        enhed: template.enhed,
        datakildeType: "api",
        apiKilde: template.kilde,
        apiQuery: template.apiQuery
      }).returning();
      if (template.kilde === "klimaregnskab" || template.kilde === "energidataservice") {
        await db2.insert(indikatorIndsatsOmraade).values({
          indikatorId: autoInd.id,
          indsatsOmraadeId: io1.id
        });
      }
      await db2.insert(kommuneIndikator).values({
        kommuneId: groenkobing.id,
        templateId: template.id,
        indikatorId: autoInd.id,
        aktiv: true
      }).onConflictDoNothing();
    }
    console.log(
      `\u2713 Gr\xF8nk\xF8bing Kommune seeded: 5 indsatsomr\xE5der, 22 tiltag, 3 m\xE5l, 5 tovholdere, ${4 + templates.length} indikatorer`
    );
  } finally {
    await client2.end();
  }
}

// db/seed.ts
var client = postgres2(process.env.DATABASE_URL);
var db = drizzle2(client);
var CCTF_V25_CRITERIA = [
  {
    version: "2.5",
    kriterieNr: 1,
    komponent: "Forpligtelse, styring og mainstreaming",
    titel: "Offentlig forpligtelse",
    beskrivelse: "Offentlig forpligtelse fra siddende borgmester (eller kommunalbestyrelse) til at igangs\xE6tte hurtig, rimelig og retf\xE6rdig handling ved anvendelse af tilg\xE6ngelige bef\xF8jelser og indflydelse til at opn\xE5 netto-nuludledning og styrke klimarobustheden i overensstemmelse med Parisaftalens h\xF8jeste ambition (1.5\xB0C)."
  },
  {
    version: "2.5",
    kriterieNr: 2,
    komponent: "Forpligtelse, styring og mainstreaming",
    titel: "Klimaintegration i styring",
    beskrivelse: "Klimaforpligtelser og -hensyn er integreret i interne styrings- og beslutningsstrukturer, processer og funktioner, hvilket sikrer, at klimap\xE5virkningen overvejes og inkluderes som en del af kommunens \xF8vrige prioriteter."
  },
  {
    version: "2.5",
    kriterieNr: 3,
    komponent: "Inkluderende inddragelse og kommunikation",
    titel: "Inddragelse af interessenter",
    beskrivelse: "Inddragelse af forskellige interessenter for at indsamle information til brug i klimaplanl\xE6gningen samt for at advokere for - og skabe opbakning til - klimaindsatsen. Interessenterne b\xF8r omfatte dem, der p\xE5virkes mest af klimaforandringerne og klimatiltagene, samt dem, der har magt, indflydelse og potentiale til at reducere emissioner og klimarisici."
  },
  {
    version: "2.5",
    kriterieNr: 4,
    komponent: "Inkluderende inddragelse og kommunikation",
    titel: "Kommunikation og samarbejde",
    beskrivelse: "Kommunikation til og samarbejde med lokalsamfundet og andre interessenter som en del af klimaindsatsen."
  },
  {
    version: "2.5",
    kriterieNr: 5,
    komponent: "Viden som grundlag for m\xE5l, strategier og handlinger",
    titel: "Klimarisici og s\xE5rbarhed",
    beskrivelse: "Vidensgrundlag for klimatilpasning baseret p\xE5 identificering af klimafarer, klimarelaterede risici og s\xE5rbarheder."
  },
  {
    version: "2.5",
    kriterieNr: 6,
    komponent: "Viden som grundlag for m\xE5l, strategier og handlinger",
    titel: "Vidensgrundlag for reduktion",
    beskrivelse: "Vidensgrundlag for reduktion af drivhusgasudledninger baseret p\xE5 drivhusgasregnskab, fremskrivning og analyse af tilg\xE6ngelige bef\xF8jelser."
  },
  {
    version: "2.5",
    kriterieNr: 7,
    komponent: "Viden som grundlag for m\xE5l, strategier og handlinger",
    titel: "Retf\xE6rdighed og rimelighed",
    beskrivelse: "Vidensgrundlag for retf\xE6rdighed og rimelighed, der identificerer s\xE5rbare og marginaliserede grupper og sociale konsekvenser af klimaforandringer og klimatiltag."
  },
  {
    version: "2.5",
    kriterieNr: 8,
    komponent: "M\xE5l for hele kommunen, underst\xF8ttet af sektorstrategier",
    titel: "Reduktionsm\xE5l",
    beskrivelse: "M\xE5l for reduktion af drivhusgasudledninger p\xE5 kort, mellemlang og lang sigt i overensstemmelse med Parisaftalens 1.5\xB0C-ambition."
  },
  {
    version: "2.5",
    kriterieNr: 9,
    komponent: "M\xE5l for hele kommunen, underst\xF8ttet af sektorstrategier",
    titel: "Tilpasningsm\xE5l",
    beskrivelse: "M\xE5l for klimatilpasning og \xF8get klimarobusthed p\xE5 kort, mellemlang og lang sigt."
  },
  {
    version: "2.5",
    kriterieNr: 10,
    komponent: "M\xE5l for hele kommunen, underst\xF8ttet af sektorstrategier",
    titel: "Retf\xE6rdighedsm\xE5l",
    beskrivelse: "M\xE5l p\xE5 kort, mellemlang og lang sigt, der skal sikre, at klimatiltag bidrager til at fremme social, milj\xF8m\xE6ssig og \xF8konomisk rimelighed, retf\xE6rdighed og lighed."
  },
  {
    version: "2.5",
    kriterieNr: 11,
    komponent: "M\xE5l for hele kommunen, underst\xF8ttet af sektorstrategier",
    titel: "Sektorstrategier",
    beskrivelse: "Sektorspecifikke strategier, der tilsammen opfylder kommunens m\xE5l for klimatilpasning, netto-nuludledning samt rimelighed og retf\xE6rdighed."
  },
  {
    version: "2.5",
    kriterieNr: 12,
    komponent: "Handlinger og implementeringsplanl\xE6gning baseret p\xE5 vidensgrundlaget",
    titel: "Tiltag",
    beskrivelse: "Tilpasnings- og reduktionstiltag, der er baseret p\xE5 vidensgrundlaget, m\xE5l og delm\xE5l, som demonstrerer brug af alle tilg\xE6ngelige bef\xF8jelser, partnerskaber og indflydelse."
  },
  {
    version: "2.5",
    kriterieNr: 13,
    komponent: "Handlinger og implementeringsplanl\xE6gning baseret p\xE5 vidensgrundlaget",
    titel: "Udfasning af fossile br\xE6ndstoffer",
    beskrivelse: "Kommunen skal bruge alle tilg\xE6ngelige bef\xF8jelser til at stoppe brugen af og st\xF8tten til fossile br\xE6ndstoffer. Dette omfatter at tage alle tilg\xE6ngelige skridt for at sikre, at der ikke bygges/udvides/forl\xE6nges nye el- og varmeproduktionsanl\xE6g eller udvindingsanl\xE6g til fossile br\xE6ndstoffer, og at alle kulfyrede kraftv\xE6rker er udfaset inden 2030."
  },
  {
    version: "2.5",
    kriterieNr: 14,
    komponent: "Handlinger og implementeringsplanl\xE6gning baseret p\xE5 vidensgrundlaget",
    titel: "Implementeringsplanl\xE6gning",
    beskrivelse: "Implementeringsplanl\xE6gning for prioriterede handlinger, der er blevet identificeret p\xE5 kort sigt. Dette b\xF8r omfatte: underst\xF8ttende tiltag, implementeringsplan, tidsramme og milep\xE6le, ber\xF8rte interessenter, detaljerede omkostninger, finansiering og finansieringsmetode, fordeling af merv\xE6rdier, indikatorer."
  },
  {
    version: "2.5",
    kriterieNr: 15,
    komponent: "Monitorering, evaluering og rapportering af fremdrift med fokus p\xE5 l\xE6ring",
    titel: "MERL-system",
    beskrivelse: "Et system til monitorering, evaluering, rapportering og l\xE6ring af erfaringer (MERL) fra implementering af klimatiltag, som omfatter et s\xE6t indikatorer til at vurdere implementering af tiltag og fremskridt p\xE5 output-, outcome- og impactniveau."
  },
  {
    version: "2.5",
    kriterieNr: 16,
    komponent: "Monitorering, evaluering og rapportering af fremdrift med fokus p\xE5 l\xE6ring",
    titel: "Offentlig rapportering",
    beskrivelse: "L\xF8bende offentlig kommunikation og rapportering af status for implementering af klimaplanen og fremdrift mod klimam\xE5lene."
  }
];
async function seed() {
  console.log("Seeding CCTF v2.5 criteria...");
  await db.insert(cctfKriterie).values(CCTF_V25_CRITERIA).onConflictDoNothing();
  console.log(`Seeded ${CCTF_V25_CRITERIA.length} criteria.`);
  console.log("Seeding admin user...");
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123!";
  const passwordHash = await hash2(adminPassword);
  await db.insert(user).values({
    email: "augustseptimius@gmail.com",
    passwordHash,
    navn: "August Septimius",
    role: "admin"
  }).onConflictDoNothing();
  console.log("Admin user seeded (email: augustseptimius@gmail.com).");
  console.log("Seeding indicator templates...");
  const { indikatorTemplate: indikatorTemplate2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  await db.insert(indikatorTemplate2).values([
    {
      titel: "Samlet CO\u2082e pr. capita",
      kilde: "klimaregnskab",
      apiQuery: JSON.stringify({ type: "N\xF8gletal", sektor: "Samlet" }),
      enhed: "ton CO\u2082e/indb.",
      beskrivelse: "Kommunens samlede drivhusgasudledning pr. indbygger. Kilde: Klimaregnskabet.dk.",
      cctfKriterier: [6, 11, 15],
      aktiv: true
    },
    {
      titel: "VE-kapacitet (vind + sol)",
      kilde: "energidataservice",
      apiQuery: JSON.stringify({ dataset: "CapacityPerMunicipality", fields: ["OnshoreWindMW", "SolarPowerMW"] }),
      enhed: "MW",
      beskrivelse: "Samlet installeret kapacitet for landvind og solenergi i kommunen. Kilde: Energi Data Service.",
      cctfKriterier: [7, 11],
      aktiv: true
    },
    {
      titel: "Befolkningstal",
      kilde: "dst",
      apiQuery: JSON.stringify({ tabel: "FOLK1A", variabler: { K\u00D8N: "TOT", ALDER: "IALT" }, felt: "INDHOLD" }),
      enhed: "antal",
      beskrivelse: "Kommunens samlede folketal. Bruges til beregning af pr.-capita-indikatorer. Kilde: Danmarks Statistik.",
      cctfKriterier: [],
      aktiv: true
    }
  ]).onConflictDoNothing();
  console.log("Seeded 3 indicator templates.");
  console.log("Seeding Gr\xF8nk\xF8bing Kommune...");
  await seedGroenkobing();
  process.exit(0);
}
seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
