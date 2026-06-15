# klimastatus.dk — MVP Design Spec

> **Opdatering 2026-06-15 — Selvevaluering udfaset.** Selvevalueringsskemaet til CCTF-recertificering er taget ud; CCTF bevares som rammeværk for løbende rapportering. Se `AGENTS.md`. Den daterede spec nedenfor er bevaret som historik.

## Hvad vi bygger

Et SaaS-værktøj til klimakoordinatorer i danske kommuner. Platformen samler tovholder-status, offentlige data og AI-generering i ét system der producerer den årlige Klimastatus-rapport til byrådet og (sjældnere) selvevalueringsskemaet til CCTF-recertificering.

Målet: en klimakoordinator laver næste års Klimastatus på en uge frem for to måneder.

## Deadline

1. september 2026. Daglige sessioner. Claude koder alt.

## Brugere

| Rolle | Antal pr. kommune | Adgang |
|---|---|---|
| Klimakoordinator | 1 (evt. 2) | Email + password login |
| Tovholder | 5-20 | Magic link, ingen konto |
| Admin (dig) | 1 | Separat admin-panel |

## Arkitektur

**Tilgang A: fuld stack fra dag 1.** Kørende system fra start, features bygges lodret én ad gangen.

### Tech stack

- **App:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Database:** PostgreSQL 16 med pgvector
- **ORM:** Drizzle ORM
- **Background jobs:** pg-boss (Postgres-backed jobkø)
- **Validation:** Zod
- **Auth:** Auth.js — email+password for koordinatorer, magic links for tovholdere
- **AI:** Mistral Large 2 / Small 3 via la Plateforme (EU), Vercel AI SDK
- **Vector search:** pgvector + Mistral embed API

### Hosting

- **VPS:** Hetzner Cloud, Falkenstein, Tyskland (EU/GDPR)
- **Containers:** Docker Compose — app + Postgres + Caddy (reverse proxy, auto-HTTPS)
- **Deployment:** GitHub Actions → build → push til GitHub Container Registry → SSH pull på Hetzner
- **DNS:** Domæne hos One.com, name servers peges til Cloudflare
- **Subdomæner:** Hver kommune får `<kommunenavn>.klimastatus.dk`
- **Email:** Brevo (EU, gratis tier)
- **Errors:** Sentry (EU)
- **Backup:** Daglig pg_dump til Backblaze B2 EU
- **Object storage:** Hetzner Object Storage (S3-kompatibelt) til logoer, skabeloner, uploads

### Forventet driftsomkostning

MVP: 400-700 kr/md. Ved 25 kunder: 1.500-2.500 kr/md.

## Features

### 1. Koordinator-dashboard

Hjemmebasen efter login. Viser:

- Overordnet CCTF-status: 16 kriterier med dækningsgrad (grøn/gul/rød)
- Tovholder-status: hvem har svaret, hvem mangler
- Data-freshness: seneste data fra offentlige kilder, alder
- Genveje til kerneopgaver

### 2. Onboarding (ny kommune)

Flowet når en ny kommune oprettes:

1. Admin (dig) opretter kommune i admin-panelet med kommunenavn — ét klik
2. Systemet henter automatisk: kommunedata (kommunekode, befolkningstal, areal fra DST), logo og farver fra kommunens hjemmeside
3. AI'en finder og henter kommunens offentliggjorte klimaplan/klimahandlingsplan
4. AI'en foreslår indsatsområder, tiltag og mål baseret på klimaplanen
5. Koordinatoren logger ind, gennemgår og godkender/retter det foreslåede
6. Systemet viser hvad der mangler og guider koordinatoren igennem hullerne med konkrete spørgsmål
7. Subdomæne (`<kommunenavn>.klimastatus.dk`) oprettes automatisk

### 3. Handlingsoverblik

Koordinatorens styringsværktøj for alle tiltag/handlinger:

- Samlet overblik over alle handlinger med status (planlagt/igangværende/gennemført/udgået), tovholder, tidsramme, sektor
- Filtrering og sortering på indsatsområde, status, tovholder, tidsramme
- Redigér handlinger: beskrivelse, status, tidsramme, forventet CO2-effekt
- Skift tovholder med ét klik
- Opret nye handlinger og knyt til indsatsområder og tovholdere
- Se hvad tovholderen sidst rapporterede for hver handling

### 4. Tovholder-input

Hvad tovholderne ser:

1. Koordinatoren klikker "Send til tovholdere" i dashboardet
2. Hver tovholder modtager email med personligt link (`<kommune>.klimastatus.dk/rapport/<token>`)
3. Tovholderen klikker linket — ingen login, ingen konto
4. Desktop-first formular med overblik over alle deres tiltag (typisk mange per tovholder)
5. For hvert tiltag: status, fremdrift, barrierer, næste skridt
6. Kan komme tilbage og redigere inden deadline
7. Automatisk rykker-email efter X dage

**Sikkerhed:** Tokens genereres med crypto.randomBytes (32 bytes), SHA-256-hashed i database, bundet til specifik tovholder, eksplicit udløbsdato, one-time-use til session-oprettelse.

### 5. Automatisk dataindhentning

Kører i baggrunden via pg-boss background jobs:

| Datakilde | Data | CCTF-kriterier | Frekvens |
|---|---|---|---|
| Klimaregnskabet.dk | GPC CO2-regnskab pr. sektor | 6 | Månedligt |
| Energidataservice | Energiforbrug, VE, fjernvarme | 6, 11, 15 | Dagligt |
| BBR | Bygningsmasse, varmekilder | 11, 15 | Ugentligt |
| Danmarks Statistik | Elbiler, transport, demografi | 6, 7, 11, 15 | Månedligt |

Fejlhåndtering: tre forsøg med eksponentiel backoff. Stale data markeres i UI med alder. Fejl logges i Sentry og vises i admin-panel.

### 6. Datastyring

Koordinatorens fulde kontrol over datagrundlaget:

- Samlet overblik over alle datapunkter med kilde og tidsstempel
- Redigér automatisk hentet data — original bevares, ændring logges med begrundelse
- Upload manuelt data via CSV eller manuel indtastning
- Tilføj/fjern datakilder og indikatorer
- Fuld sporbarhed: hvem, hvornår, hvad, original vs. ny værdi, begrundelse

### 7. Scenarieberegner

Interaktivt værktøj til CO2-fremskrivninger:

- BAU-fremskrivning baseret på historisk data
- Tilføj planlagte tiltag med estimeret CO2-gevinst og tidsramme
- Graf der viser effekten af hvert tiltag mod kommunens reduktionsmål
- Tilføj/fjern tiltag og se kurven ændre sig
- Gap-analyse: afstanden mellem nuværende scenarie og mål (manko-visning)

### 8. AI Klimastatus-rapport (kernefeature)

Det der sparer de 4-8 uger:

- AI genererer komplet udkast til den årlige Klimastatus baseret på tovholder-svar, offentlige data, og kommunens tidligere rapporter
- Skrives i kommunens politiske sprog og tone (lært fra uploadede eksempler)
- Koordinatoren redigerer afsnit for afsnit — starter med ~80% færdigt materiale
- AI'en kender hele datasættet på tværs og kan referere internt
- Al AI-genereret tekst markeres visuelt indtil manuelt godkendt

**AI-arkitektur:**
- Tre-lags prompting: system (kommunens tone) → kontekst (relevante data) → opgave (skriv afsnit X)
- Prompt templates versioneret i database
- Vector search via pgvector til at finde relevant kontekst på tværs
- Embeddings via Mistral embed API
- Streaming output via Server-Sent Events
- Aldrig auto-publicering — koordinatoren godkender altid

### 9. Selvevaluering

Bruges ved CCTF-recertificering (hvert ~4. år):

- For hvert af de 16 kriterier samler systemet automatisk dokumentation fra tiltag, indikatorer, tovholder-svar, data
- Vurderer dækningsgrad: komplet/delvis/manglende
- AI genererer udkast til dokumentationstekst per kriterie
- Koordinatoren gennemgår og redigerer
- "Hvad mangler?"-visning per kriterie
- Mulighed for supplerende fri-tekst-argumentation
- Eksport i CCTF-format og CONCITOs spørgeskemaformat

**CCTF-versionering:** Kriterie-definitioner gemmes som versionerede records i databasen. Nye versioner oprettes via admin-UI uden at slette gamle. Selvevalueringer refererer eksplicit til CCTF-version.

### 10. PDF-eksport

- Klimastatus-rapport som PDF i kommunens layout (logo, farver, skrifttyper)
- Selvevalueringsskema i CCTF-format
- CONCITOs spørgeskemaformat
- Pipeline: HTML med Tailwind → Puppeteer (separat Docker-container) → PDF
- Template baseres på uploadet PDF-eksempel fra kommunen + logo/farver, oversættes til HTML-template ved onboarding
- Template styres via kommune-opsætning, kan opdateres

### 11. Admin-panel (kun dig)

- Opret ny kommune: skriv kommunenavn, klik "Opret", systemet klarer resten
- Oversigt over alle kommuner og status
- Rediger CCTF-kriterier og opret nye versioner
- Status på datakilder og background jobs
- Fejllog

## Datamodel

Baseret på det eksisterende datamodel-dokument. CCTF-kriterierne er rygraden via en central mapping-tabel (`cctf_kriterie_mapping`). Tre arkitektoniske invarianter:

1. **Kriterier som rygrad** — alt data kan knyttes til CCTF-kriterier via mapping-tabel
2. **Cross-cutting tags** — beføjelseskategori, retfærdig fordeling og forbrugskategori som tags, ikke separate entiteter
3. **Indikatorer som separate entiteter** — kan dokumentere flere tiltag og mål

### Kerneentiteter (alle i MVP)

Kommune, Indsatsområde, Mål, Tiltag, Tovholder, Tovholder_rapport, Indikator, Indikator_måling, Aktør, Sårbar_gruppe, Klimafare, Konsekvensvurdering, Drivhusgasregnskab_post, Scenarie_post, Beføjelses_vurdering, CCTF_kriterie_mapping, Selvevaluering

Se `klimastatus-dk-datamodel.md` for fuld feltbeskrivelse.

## Audit log

Append-only `events`-tabel. Alle skriveoperationer logges med: bruger, entitet, handling, før/efter-state (JSONB), tidsstempel. Sporbarhed på alle data- og dokumentændringer.

## GDPR

- Persondata: kun tovholder (navn, email, forvaltning) og koordinator (login)
- Ingen borgerdata, ingen følsomme kategorier
- Al data i EU (Hetzner DE, Mistral FR, Brevo FR, Sentry DE)
- Databehandleraftale klar ved første kunde
- Sletteflow ved opsigelse: eksport → sletning efter 30 dage → logget

## Byggerækkefølge

| Uge | Feature |
|---|---|
| 1-2 | Projekt-setup, database-schema, Docker, deployment til Hetzner |
| 3-5 | Auth, onboarding, koordinator-dashboard, kommune-opsætning |
| 6-8 | Handlingsoverblik + tovholder-flow (magic links, formular, rykkere) |
| 9-11 | Dataindhentning fra offentlige API'er + datastyring |
| 12-13 | Scenarieberegner |
| 14-15 | AI Klimastatus-rapport (tekstgenerering) |
| 16 | Selvevaluering med auto-udfyldning |
| 17 | PDF-eksport |
| 18+ | Buffer til test, polish, rettelser |

## Afgrænsning (ikke i MVP)

- Peer benchmarking på tværs af kommuner
- Offentligt live-dashboard (kriterie 16)
- Klimatilpasnings-modul med kortvisualisering (PostGIS)
- Integration med GIS/ESDH-systemer
- Tilpasning til norske/svenske rammer
- Stripe/automatisk fakturering (manuel fakturering via Dinero/e-conomic)
