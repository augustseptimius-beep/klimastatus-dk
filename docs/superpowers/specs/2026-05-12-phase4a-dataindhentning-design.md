# Phase 4a: Dataindhentning — Design

## Hvad vi bygger

Et dynamisk indikatorsystem hvor admin kuraterer et katalog af ~50 præ-screenede datapunkter fra offentlige danske API'er, og koordinatorer aktiverer de indikatorer der er relevante for deres kommune. Platformen henter data automatisk én gang om måneden og viser dem på et dedikeret data-overblik og på dashboardet.

**Udenfor scope (Phase 4b):** Manuel dataindtastning, CSV-upload, redigering af auto-hentet data, audit trail.

---

## Datakilder

| Kilde | Data | Auth | Frekvens |
|---|---|---|---|
| Klimaregnskabet.dk | GPC CO2-udledning pr. sektor | API-nøgle (env var) | Månedligt |
| Energi Data Service | VE-kapacitet (vind + sol MW) | Ingen | Månedligt |
| Danmarks Statistik | Konfigurerbare tabeller (f.eks. elbiler, befolkning) | Ingen | Månedligt |

**BBR er udskudt** — kræver separat Dataforsyningen-auth og er ikke i doughnut-projektet. Tilføjes i en senere iteration.

---

## Datamodel

### Nye tabeller

#### `indikatorTemplate`
Globalt admin-styret katalog. Ét indikatorTemplate pr. datapunkt.

| Kolonne | Type | Beskrivelse |
|---|---|---|
| id | uuid pk | |
| titel | text | Visningsnavn, f.eks. "Samlet CO₂e pr. capita" |
| kilde | enum | `'klimaregnskabet' \| 'energidataservice' \| 'dst'` |
| apiQuery | jsonb | Kilde-specifikke parametre (tabel-ID, filtre, felt-mapping) |
| enhed | text | F.eks. "ton CO₂e/indb.", "MW", "antal" |
| beskrivelse | text | Kort forklaring til koordinatoren |
| cctfKriterier | int[] | F.eks. [6, 11, 15] |
| aktiv | boolean | Skjult i katalog hvis false |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

**`apiQuery` eksempler:**
```json
// Klimaregnskabet.dk
{ "type": "Nøgletal", "sektor": "Samlet" }

// Energi Data Service
{ "dataset": "CapacityPerMunicipality", "fields": ["OnshoreWindMW", "SolarPowerMW"] }

// Danmarks Statistik
{ "tabel": "FOLK1A", "variabler": { "KØN": "TOT", "ALDER": "IALT" }, "felt": "INDHOLD" }
```

#### `kommuneIndikator`
Aktivering af et template for én kommune.

| Kolonne | Type | Beskrivelse |
|---|---|---|
| id | uuid pk | |
| kommuneId | uuid fk → kommune | |
| templateId | uuid fk → indikatorTemplate | |
| indikatorId | uuid fk → indikator | Auto-oprettet ved aktivering |
| visningsnavn | text nullable | Kommunens eget label (overskriver template titel) |
| aktiv | boolean | Default true |
| sidstHentet | timestamptz nullable | Tidspunkt for seneste vellykkede hentning |
| sidsteFejl | timestamptz nullable | Tidspunkt for seneste fejl |
| sidsteFejlBesked | text nullable | Fejlbesked fra API |
| createdAt | timestamptz | |

### Eksisterende tabeller (uændrede)

- **`indikator`** — auto-oprettes fra template ved aktivering (én pr. kommuneIndikator). Eksisterende felter `apiKilde` og `apiQuery` genbruges.
- **`indikatorMaaling`** — gemmer alle hentede værdier. `autoHentet = true` for API-data. `aar` bruges til historiske opslag.
- **`drivhusgasregnskabPost`** — Klimaregnskabet.dk-data skrives *også* hertil (bruges af scenarieberegneren i Phase 6).

---

## Fetch-jobs

Tre pg-boss-jobs tilføjes i `instrumentation-node.ts`. Alle kører **1. i måneden kl. 06:00** (`0 6 1 * *`).

### Fælles adfærd for alle jobs

- Henter alle aktive `kommuneIndikator`-rækker for den pågældende kilde
- Kører pr. kommune med 0,5 s forsinkelse mellem kald (rate limiting)
- 3 forsøg med eksponentiel backoff (1 s → 2 s → 4 s) ved netværksfejl
- Ved succes: opdater `sidstHentet`, indsæt/opdater `indikatorMaaling`-rækker
- Ved vedvarende fejl: opdater `sidsteFejl` + `sidsteFejlBesked`, fortsæt til næste kommune
- Ingen Sentry (hobby-projekt) — fejl logges til konsol

### `fetch-klimaregnskabet`

**Endpoint:** `GET https://klimaregnskabet.dk/api/municipality-data`

**Parametre:** `municipality={kommunekode}`, `year={år}`, `type=Nøgletal`

**Auth:** Header `x-api-key: {KLIMAREGNSKABET_API_KEY}`

**Logik:**
1. For hvert aktivt kommuneIndikator med `kilde = 'klimaregnskabet'`
2. Hent data for `currentYear - 1` (seneste komplette år) samt de 3 foregående år (i alt 4 år ved første kørsel)
3. Gem samlet CO₂e i `indikatorMaaling` (ét datapunkt pr. år)
4. Skriv også til `drivhusgasregnskabPost` (én række pr. sektor pr. år)
5. Tag max-værdien ved duplikate records (inkluderer landbrug — matcher Klimaregnskabet.dk-websitet)

**Backfill-logik:** Ved første aktivering hentes `currentYear - 4` til `currentYear - 1`. Efterfølgende hentes kun det seneste år.

### `fetch-energidataservice`

**Endpoint:** `GET https://api.energidataservice.dk/dataset/CapacityPerMunicipality?limit=0&sort=Month%20desc`

**Auth:** Ingen

**Logik:**
1. Hent alle records én gang (ikke pr. kommune — API returnerer alle kommuner)
2. Filtrer på `MunicipalityNo` matchende aktive kommuner
3. Tag seneste måned pr. kommune
4. Beregn `totalMW = OnshoreWindMW + SolarPowerMW`
5. Gem i `indikatorMaaling`

### `fetch-dst`

**Endpoint:** `POST https://api.statbank.dk/v1/data`

**Auth:** Ingen

**Logik:**
1. For hvert aktivt kommuneIndikator med `kilde = 'dst'`
2. Læs `apiQuery.tabel`, `apiQuery.variabler`, `apiQuery.felt` fra template
3. Byg POST-payload med kommunekode som OMRÅDE-filter
4. Parse CSV-svar (semikolon-separeret, komma som decimaltegn)
5. Håndter missing-data-koder: `""`, `".."`, `"-"`, `"x"` → null
6. Gem i `indikatorMaaling`

**Rate limiting:** 0,6 s mellem kald til DST API.

---

## Admin UI

### `/admin/indikatorer`

Liste over alle `indikatorTemplate`-rækker med: titel, kilde-badge, enhed, CCTF-kriterier, aktiv-toggle.

**"Tilføj indikator"-formular:**
- Titel (tekst)
- Kilde (dropdown: Klimaregnskabet.dk / Energi Data Service / Danmarks Statistik)
- API-query (JSON-tekstfelt — forudfyldt eksempel vises ved kildevalg)
- Enhed (tekst)
- Beskrivelse (textarea)
- CCTF-kriterier (multi-select: 1–17)
- Aktiv (checkbox)

Ingen kompleks query builder — admin kender DST-tabelkoder fra doughnut-projektet.

---

## Koordinator UI

### `/data` — to faneblade

**Faneblad 1: "Aktive indikatorer"**

Tabel med alle kommunens aktive `kommuneIndikator`-rækker:
- Indikatorens titel
- Seneste værdi + enhed + årstal
- Kilde-badge
- Staleness-advarsel: gult ikon hvis `sidstHentet` er > 35 dage siden
- Fejl-badge: rødt ikon med tooltip hvis `sidsteFejl` er nyere end `sidstHentet`
- "Hent nu"-knap (enqueue pg-boss job øjeblikkeligt for denne indikator)
- "Deaktiver"-knap

**"Hent nu"-dialog:** Viser en valgfri "Fra år"-picker (default: 4 år tilbage). Til koordinatorer der ønsker mere historik.

**Faneblad 2: "Tilføj indikator"**

Katalog over alle aktive `indikatorTemplate`-rækker, grupperet efter kilde. Kort med: titel, beskrivelse, enhed, CCTF-kriterier. "Aktivér"-knap pr. kort. Allerede aktiverede vises som grå med "Aktiv"-badge.

### Dashboard

To nye `StatusCard`-kort i dashboardets øverste række (udover de eksisterende tre):
- **CO₂e pr. capita** — seneste Klimaregnskabet.dk-værdi for kommunen (viser år)
- **VE-kapacitet** — seneste totalMW fra Energi Data Service

Kortene vises kun hvis den pågældende indikator er aktiveret for kommunen. Ingen widgets-konfiguration i Phase 4a — det er et fremtidigt feature.

---

## Fejlhåndtering og staleness

| Tilstand | Visning |
|---|---|
| Aldrig hentet | "Afventer første hentning" |
| Hentet, < 35 dage | Grøn — viser dato |
| Hentet, > 35 dage | Gult advarselstrekant + "Senest hentet: X dage siden" |
| Fejl nyere end sidstHentet | Rødt ikon + fejlbesked i tooltip |

---

## Miljøvariabler

```
KLIMAREGNSKABET_API_KEY=   # Fra doughnut-projektet
```

`BREVO_API_KEY` og `BREVO_FROM_EMAIL` er allerede defineret fra Phase 3.

---

## Hvad er udskudt til Phase 4b (Datastyring)

- Manuel dataindtastning (busselskab, gas-indkøb)
- CSV-upload
- Redigering af auto-hentet data (original bevares, ændring logges)
- Fuld audit trail (hvem, hvornår, hvad, begrundelse)
- Sentry-integration
