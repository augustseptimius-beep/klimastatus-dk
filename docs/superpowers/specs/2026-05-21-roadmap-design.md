# Klimastatus.dk — Roadmap mod levende demo

**Dato:** 2026-05-21
**Deadline:** 1. september 2026
**Mål:** En levende demo med fiktiv model-kommune der viser "alt samlet ét sted" og automatisk CCTF-tjek

---

## Kontekst

Kodebasen har et stærkt fundament: komplet databaseskema (42 tabeller), fungerende tovholder-workflow, tre dataindhentningsjobs (pg-boss), og en skjult AI-import-funktion. Det der mangler er CCTF-UI, selvevaluerings-logik og en poleret demo med realistiske data.

Brugeren er domæneekspert (klimakoordinator, Thisted Kommune) men ikke programmør — Claude koder alt. Daglige hobby-sessioner. Kan ikke bruge rigtige Thisted-data til demoen.

---

## Demo-mål

**Primær demo-bruger:** Klimakoordinator i en dansk kommune
**Demonstreret ved:** Østerby Kommune (fiktiv model-kommune)

**Wow-moment 1 — Alt samlet ét sted:**
Koordinatoren åbner dashboardet og ser indsatsområder, tiltag, tovholderstatusser og indikatorer levende og opdaterede — ingen Excel, ingen manuelle dataopsamlinger.

**Wow-moment 2 — CCTF automatisk:**
Systemet fortæller præcis hvad der mangler for at leve op til de 16 CCTF-kriterier, og kan generere selvevalueringsskemaet automatisk.

**Bevidst udeladt fra demo-scope:**
- AI-tekstgenerering (Klimastatus-udkast pr. indsatsområde)
- PDF-eksport
- Offentligt dashboard
- Reelle email-udsendelser til tovholdere

---

## Faser

### Fase 0 — Genopliv AI-import (1-2 sessioner)

Den eksisterende AI-import (`/app/api/importer/`) er bygget men skjult pga. timeout. Skal genoplives som admin-funktion drevet af pg-boss, så store dokumenter behandles asynkront.

**Leverance:**
- Ny pg-boss job-kø: `import-handlingskatalog`
- Admin-side: upload PDF/XLSX → job enqueues → status polling → resultat til godkendelse
- Importresultat vises som forslag (ikke auto-committet til DB)
- Eksisterende Claude-integration (`claude-sonnet-4-6`) og tool-use bevares uændret

**Afgrænsning:** Ingen ændring af AI-prompt eller ekstraktionslogik.

---

### Fase 1 — Seed Østerby Kommune (2-3 sessioner)

Opret en realistisk fiktiv kommune baseret på brugernes faggkendskab og offentlig data.

**Leverance:**
- Seed-script: `db/seeds/oesterby.ts`
- 4-5 indsatsområder (energi, transport, byggeri, landbrug/natur, forbrug)
- ~20 tiltag med realistiske statusser, tovholdere og barrierer
- Mål med baseline og målværdier
- Indikatorer: mix af manuelle og auto-hentede (klimaregnskab, VE-kapacitet, DST)
- Brug AI-import (Fase 0) til at læse et fiktivt handlingskatalog ind som udgangspunkt

**Afgrænsning:** Ingen reelle email-udsendelser. Tovholder-formularer kan udfyldes manuelt i demo.

---

### Fase 2 — CCTF-lag (4-6 sessioner)

Bygger oven på det eksisterende schema (`cctf_kriterie`, `cctf_kriterie_mapping`, `selvevaluering`).

**Leverance:**
- Admin: indlæs de 16 CCTF-kriterier som DB-records (v1.0)
- Koordinator-UI: vis kriterier med status og dækningsgrad
- Mapping-UI: knyt tiltag/mål/indikatorer til specifikke kriterier (fra tiltag-siden og indsatsområde-siden)
- Dækningsgrad-beregning: pr. kriterie — hvilke entiteter dækker det, hvad mangler
- Hul-identifikation: systemet peger på manglende dokumentation pr. kriterie
- Kriterie-status vises i dashboard (D3 i arkitekturdiagram)

**Afgrænsning:** Ingen CCTF-version-migration-UI i denne fase. Ingen XML-eksport.

---

### Fase 3 — Selvevaluering (2-3 sessioner)

Auto-generering af selvevalueringsskema baseret på mappings fra Fase 2.

**Leverance:**
- Generér selvevaluering: samler dokumentation pr. kriterie til struktureret tekst
- Koordinator kan redigere og godkende tekst pr. kriterie
- Gem selvevaluering med CCTF-version og dato
- Eksport: PDF eller struktureret tekstfil egnet til CCTF-certificering
- Historik: tidligere selvevalueringer bevares uændret

**Afgrænsning:** Ingen Klimaalliance-spørgeskema-eksport i denne fase.

---

### Fase 4 — Dashboard-polish (1-2 sessioner)

Gør "alt samlet ét sted"-narrativet tydeligt og overbevisende.

**Leverance:**
- Dashboard viser: indsatsområder med status, CCTF-dækningsgrad pr. kriterie, indikatoropdateringer, tovholdersvarprocent
- Tydelige visuelle signaler: hvad er grønt, hvad mangler, hvad er forældet
- Onboarding-flow: ny koordinator kan se systemet giver mening fra første login

**Afgrænsning:** Ingen redesign af eksisterende sider — kun dashboard.

---

### Fase 5 — Resterende dataindhentning (løbende)

BBR, DMI Klimaatlas og KAMP integreres når de øvrige faser er stabile.

**Afgrænsning:** Udeladt fra demo-scope. Indikatorer der bruger disse kilder vises som "afventer integration".

---

## Tekniske principper

- Alle nye features bygges på eksisterende schema — ingen skema-ændringer der bryder migrationshistorik uden migration
- AI bruges kun via Claude (ikke Mistral som arkitekturdiagrammet angiver — dette er bevidst)
- pg-boss bruges til alle asynkrone og scheduled opgaver
- Ingen email-udsendelser til rigtige modtagere under demo-opsætning
- Seed-data er deterministisk og kan køres om uden bivirkninger

---

## Succeskriterier for demo

- [ ] Koordinator kan logge ind og se Østerby med alle indsatsområder og tiltag
- [ ] Mindst 3 indikatorer opdateres automatisk fra datakilde
- [ ] CCTF-dashboard viser dækningsgrad pr. kriterie
- [ ] Systemet identificerer mindst 3 konkrete CCTF-huller
- [ ] Selvevaluering kan genereres og eksporteres
- [ ] Ingen fejl i konsollen under demo-flow
