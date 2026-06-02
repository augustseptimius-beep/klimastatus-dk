# Design: Monitoreringscyklus (Fase 4, MERL session 2)

**Dato:** 2026-06-02
**Status:** Godkendt til implementering
**Omfang:** Minimal — cyklus-tabel + kobling til `indikator_maaling`. Ingen ny UI denne session.

## Baggrund

MERL-laget mangler sin sidste struktur-brik: **Monitoreringscyklus**. En cyklus
grupperer "en runde af monitorering" (fx *Årsstatus 2025* eller *Q1 2026*) og giver
et rent snapshot til sammenligning over tid. Datamodellen
(`klimastatus-dk-datamodel.md`, afsnit "Monitoreringscyklus") foreskriver at både
`indikator_maaling` og `tovholder_rapport` knyttes til en cyklus, og at den nuværende
unique-constraint på `indikator_maaling` ændres fra `(indikator_id, aar)` til
`(indikator_id, monitoreringscyklus_id)` — en breaking change.

Denne session leverer **kun det nødvendige**: cyklus-tabellen, koblingen til
`indikator_maaling`, automatisk årlig cyklus-oprettelse, og sikker backfill af
eksisterende live-data. Koblingen af `tovholder_rapport` og `laeringspost` til cyklus
udskydes til de funktioner udvikles.

## Beslutninger truffet

- **Omfang:** Kun `monitoreringscyklus` + `indikator_maaling`-kobling nu.
- **Cyklus-styring:** Automatisk årlig oprettelse ("Årsstatus {år}") + mulighed for
  manuelle kvartals-/ad-hoc-cyklusser senere. Ingen admin-UI i denne session.
- **Migrationsstrategi:** Approach A — per-(kommune, år) cyklusser, kommune udledt,
  alt atomisk i én migration.

## Datamodel

### Nye enums (`db/schema/enums.ts`)

```ts
export const monitoreringsTypeEnum = pgEnum('monitorerings_type', [
  'aarlig', 'kvartal', 'ad_hoc',
]);
export const monitoreringsStatusEnum = pgEnum('monitorerings_status', [
  'aaben', 'lukket', 'rapporteret',
]);
```

### Ny tabel `monitoreringscyklus` (`db/schema/monitorering.ts`)

| Felt | Type | Note |
|---|---|---|
| `id` | uuid PK | `defaultRandom()` |
| `kommune_id` | uuid FK → kommune | NOT NULL, `onDelete: cascade` |
| `navn` | text | NOT NULL, fx "Årsstatus 2025" |
| `periode_start` | date | nullable |
| `periode_slut` | date | nullable |
| `type` | `monitorerings_type` | NOT NULL |
| `aar` | integer | nullable; sat for årlige cyklusser |
| `status` | `monitorerings_status` | NOT NULL, default `aaben` |
| `created_at` | timestamptz | `defaultNow()` |
| `updated_at` | timestamptz | `defaultNow()` |

**Unik constraint:** `(kommune_id, type, aar)` — sikrer præcis én årlig cyklus pr.
kommune pr. år, hvilket gør auto-oprettelsen idempotent. (For `kvartal`/`ad_hoc` med
`aar = null` håndhæver constrainten ikke unikhed, hvilket er ønsket — de styres manuelt.)

### Ændring af `indikator_maaling` (`db/schema/indikator.ts`)

- Ny kolonne `monitoreringscyklus_id` uuid FK → monitoreringscyklus,
  NOT NULL (efter backfill), `onDelete: cascade`.
- `aar` **beholdes** som bekvemt sorterings-/visningsfelt — ingen information mistes.
- Gammel constraint `indikator_maaling_indikator_aar_unique` droppes.
- Ny constraint `indikator_maaling_indikator_cyklus_unique` på
  `(indikator_id, monitoreringscyklus_id)`.

## Migration (én fil, atomisk i transaktion)

Drizzle-migrationer kører som SQL-filer ved container-opstart via
`scripts/migrate.mjs` (se `project_deployment`-noten). Drizzle-kit genererer schema-DDL;
backfill-SQL tilføjes manuelt i samme migrationsfil, så hele skiftet er atomisk —
enten lykkes alt, eller intet ændres.

Rækkefølge:

1. **Opret** enums `monitorerings_type`, `monitorerings_status` og tabel
   `monitoreringscyklus`.
2. **Tilføj** `monitoreringscyklus_id` til `indikator_maaling` som **nullable**.
3. **Backfill:**
   - For hver eksisterende måling udledes kommunen via `COALESCE` af to stier:
     - **API-indikator:** `kommune_indikator.kommune_id` hvor
       `kommune_indikator.indikator_id = indikator_maaling.indikator_id`.
     - **Manuel indikator:** `indikator_indsats_omraade` →
       `indsats_omraade.kommune_id`.
     - (Reserve-stier hvis nødvendigt: `indikator_maal` → `maal` →
       `indsats_omraade.kommune_id`; `indikator_tiltag` → `tiltag` → indsatsområde.)
   - Opret én `monitoreringscyklus` pr. distinkt `(kommune_id, aar)` der optræder i
     målingerne, med `type = 'aarlig'`, `navn = 'Årsstatus ' || aar`,
     `status = 'rapporteret'` (historiske runder er afsluttede), `aar = aar`.
   - Sæt hver målings `monitoreringscyklus_id` til den matchende cyklus.
4. **Vagt-tjek:** Hvis nogen måling stadig har `monitoreringscyklus_id IS NULL`
   (kommune kunne ikke udledes), skal migrationen fejle højlydt (`RAISE EXCEPTION`)
   frem for at tabe data. Det er ønsket adfærd — det afslører en data-integritetsfejl.
5. **Sæt** `monitoreringscyklus_id` NOT NULL.
6. **Drop** gammel unique-constraint, **tilføj** ny på
   `(indikator_id, monitoreringscyklus_id)`.

> Note: Målinger med `aar IS NULL` (kun `dato` sat) var ikke dækket af den gamle
> constraint. I praksis findes de ikke i nuværende data (seed bruger altid `aar`).
> Backfill grupperer på `aar`; skulle en `aar IS NULL`-måling findes, fanges den af
> vagt-tjekket i trin 4 og må håndteres eksplicit. Dette logges som en kendt kant.

## Application-lag

### `ensureAarligCyklus(kommuneId, aar)` (`db/queries/monitorering.ts`)

Idempotent helper: returnerer den eksisterende årlige cyklus for `(kommune, aar)`
eller opretter den (`type='aarlig'`, `navn='Årsstatus {aar}'`, `status='aaben'`).
Bruger `onConflictDoNothing`/`onConflictDoUpdate` på unik-constrainten for at undgå
race conditions.

### Indkobling i målingsskrivning

Alle steder hvor `indikator_maaling` indsættes skal først kalde `ensureAarligCyklus`
og sætte `monitoreringscyklus_id`. Berørte steder (verificeres under implementering):

- `lib/jobs/fetch-klimaregnskabet.ts`
- `lib/jobs/fetch-energidataservice.ts`
- `lib/jobs/fetch-dst.ts`
- Evt. manuel målingsindtastning i `app/(app)/data/`-fladen.
- `db/seeds/oesterby.ts` (seed skal afspejle den nye struktur).

Disse jobs har i forvejen et `aar` til rådighed pr. måling; kommunen kendes fra
`ActiveKommuneIndikator.kommuneId`.

### Queries der læser målinger

`db/queries/public-dashboard.ts` og dashboard-/data-sider læser i dag pr. `aar`.
Disse skal fortsat virke uændret, da `aar` beholdes på målingen. Ingen ændring
nødvendig nu; cyklus-baseret visning kommer i en senere fase.

## Test (TDD)

- **Schema/migration:** test at backfill grupperer korrekt — sæt målinger op for to
  kommuner over flere år, kør migration, assertér at der dannes én cyklus pr.
  (kommune, år) og at hver måling peger på den rette.
- **`ensureAarligCyklus`:** idempotens (to kald → én række), korrekt navn/type/status,
  isolation pr. kommune.
- **Constraint:** to målinger for samme `(indikator, cyklus)` afvises; samme indikator
  i to forskellige cyklusser tillades.
- **Vagt-tjek:** måling uden udledelig kommune får migrationen til at fejle (testes på
  migrations-logikken, ikke nødvendigvis i prod-stien).
- **Jobs:** fetch-jobs opretter/genbruger cyklus og sætter `monitoreringscyklus_id`.

Eksisterende query-tests (`public-dashboard.test.ts`, m.fl.) skal fortsat passere.

## Bevidst udskudt (YAGNI for nu)

- Admin-UI til manuel oprettelse/lukning af kvartals-/ad-hoc-cyklusser.
- `monitoreringscyklus_id` på `tovholder_rapport` og `laeringspost`.
- Cyklus-baseret visning/sammenligning i dashboards.
- Interventionslogik-kobling (V2).

## Risici

- **Breaking migration på live-data.** Afbødet ved: atomisk transaktion, vagt-tjek der
  fejler højlydt frem for at tabe data, og at nuværende produktionsdata reelt kun er
  demo/seed. Backup køres dagligt (se `docs/backup-runbook.md`) — verificér at en frisk
  backup findes før deploy.
- **Manuelle indikatorer uden kommune-sti.** Afbødet ved COALESCE over flere stier +
  vagt-tjek.
