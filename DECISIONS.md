# DECISIONS.md — produktionshærdning 2026-07-09

Hvad der blev ændret, hvad der bevidst IKKE blev ændret, og hvorfor.
Kontekst: solo-vedligeholdt SaaS til 3-6 risiko-averse kommunale kunder.
Ledestjerne: kedelige, robuste løsninger man kan fejlfinde kl. 22 en tirsdag.

## Ændret

### 1. Auth-guard på admin-actions (`app/admin/indikatorer/actions.ts`)
**Problem:** `createTemplateAction` og `toggleTemplateAktivAction` havde intet
auth-tjek. Server actions er selvstændige POST-endpoints — layoutets og
proxy'ens tjek beskytter dem ikke. Enhver kunne ændre det globale
indikator-katalog, som alle kunder bygger på.
**Løsning:** Ny `requireAdmin()` i `lib/dal.ts`; kaldes først i begge actions.
Regressionstests i `app/admin/indikatorer/actions.test.ts` og `lib/dal.test.ts`.

### 2. Seed-passwords i produktion (`lib/seed-guard.ts`)
**Problem:** Seed kørte ved hver container-start og oprettede admin +
demo-koordinator med fallback-passwords (`admin123!`, `klimastatus2026!`) der
står i det offentlige AGPL-repo. Manglende env-var ved første boot =
offentligt kendte credentials i produktion.
**Løsning:** `resolveSeedPassword()` — i produktion oprettes brugeren IKKE
uden env-var (høj, handlingsanvisende log i stedet); i udvikling bruges
fallback som før. Gælder `db/seed.ts`, `db/seeds/groenkobing.ts` og
`scripts/reset-admin.ts`. Kræver også ≥8 tegn overalt.

### 3. Serverstart afhænger ikke længere af seed eller eksterne API'er
**Problem:** Dockerfile-CMD var `migrate && seed && server` — en seed-fejl
(inkl. de eksterne API-kald seed lavede ved tom DB) betød at serveren ALDRIG
startede: crash-loop, site nede.
**Løsning:** Seed er nu non-fatal (`(seed || echo …) && server`); migrationer
er stadig fatale (bevidst — kode mod forkert skema er værre end nedetid).
Boot-tids API-hentning er helt slået fra i produktion — det månedlige cron-job
og "Hent nu"-knappen dækker behovet.

### 4. Magic links: indløsning flyttet fra GET til POST
**Problem:** `GET /rapport/[token]` forbrugte engangslinket. Kommunale
mailsystemer (Outlook SafeLinks/virus-scannere) forhåndshenter links → linket
var "brugt" før mennesket klikkede. Desuden: en eksisterende (evt. udløbet
eller FREMMED) `tovholder-session`-cookie kortsluttede et frisk gyldigt link —
på en delt kommune-computer kunne tovholder B lande i tovholder A's rapport.
**Løsning:** `page.tsx` uden side effects + "Fortsæt til rapport"-knap →
`indloesMagicLinkAction` (POST) validerer, forbruger og **overskriver altid**
sessionen. Delt regel i `lib/magic-link-vurdering.ts`. Brugt link + gyldig
session → /rapport (gen-klik virker); ellers → /rapport/udloebet.
**Trade-off:** ét ekstra klik for tovholderen. Accepteret — alternativet
(flergangslinks) er en reel produkt-/sikkerhedsbeslutning, se ROADMAP #6.

### 5. Kommune-sletning kræver indtastet navn (server-verificeret)
**Problem:** Cascade-sletning af en HEL kundes data lå bag en browser-
`confirm()`. Med daglig backup er værste fald ~24 timers datatab + en meget
pinlig kundesamtale.
**Løsning:** `deleteKommuneAction` afviser medmindre kommunens navn er
indtastet præcist (trim-tolerant); klienten bruger `window.prompt`. Tests
dækker afvisning/tastefejl/succes.

### 6. Fail fast på miljøvariabler (`lib/env.ts` + instrumentation)
**Problem:** Manglende `SESSION_SECRET` gav ingen fejl ved start — kun en
kryptisk 500 pr. request dybt inde i en action. `docker-compose.prod.yml`
sendte slet ikke secrets til app-containeren.
**Løsning:** `validerEnvVedStart()` kører i `instrumentation-node.ts`: fatale
mangler stopper produktions-processen med en handlingsanvisende besked;
manglende API-nøgler giver kun advarsler (feature-degradering). Compose-filen
sender nu alle secrets igennem.

### 7. Mindre, men reelle
- **Tenant-tjek af `tiltagId`** i `tilknytIndikatorTiltagAction` — man kunne
  koble sin indikator til en ANDEN kommunes tiltag (cross-tenant skrivning).
- **Rate limiting på login** (`lib/rate-limit.ts`): 10 fejlede forsøg pr.
  email pr. 15 min. In-memory med vilje — appen kører som én instans, og en
  Redis ville være mere infrastruktur at passe end problemet berettiger.
  Nulstilles ved deploy; det er fint, formålet er at stoppe brute force.

## Bevidst IKKE ændret

- **Grønkøbing-demoen seedes stadig i produktion** (inkl. nulstilling af dens
  konfiguration ved hver boot). Det er den levende salgsdemo. Kun
  password-fallbacken er lukket. At gate hele demoen bag en env-var er en
  produktbeslutning.
- **Flergangs-magic-links** (gyldige til udløb i stedet for engangs): ville
  fjerne både scanner- og telefon/desktop-problemet helt, men svækker
  sikkerheden ved videresendte emails. Produktbeslutning — se ROADMAP #6.
- **Soft-delete af kommuner**: kræver skemaændring og berøring af alle
  queries. Typed-name-bekræftelsen + daglig backup dækker den akutte risiko.
- **Delete-then-insert uden transaktion** (`setTiltagTovholdere`,
  `setTiltagEffekter`, `upsertRapport`-racet): reelt men smalt tab-vindue
  (et crash mellem to statements mister ét tiltags koblinger — synligt og
  genskabeligt i UI). Fortjener transaktioner, men roligt og samlet — ROADMAP #3.
- **RLS (Row Level Security)**: ville være dybt forsvar for tenant-isolation,
  men er et stort arbejde med Drizzle og én DB-rolle. Applikationslags-
  disciplinen + regressionstests er den pragmatiske linje nu.
- **`xlsx`-pakkens kendte sårbarheder** (prototype pollution/ReDoS, ingen fix
  tilgængelig): input kommer kun fra indloggede koordinatorer, ikke anonyme.
  Skal udskiftes, ikke lappes — ROADMAP #7.
- **Coolify-webhook over HTTP med hardcodet IP** i `deploy.yml`: kan ikke
  verificeres/ændres sikkert herfra (serverkonfiguration). ROADMAP #8.
- **Struktureret logging/Sentry**: console-præfikser + Coolify-logs er nok
  til nuværende skala; fejl-observabilitet er ROADMAP #4.
- **README-loginoplysningerne** (`koordinator@oesterby.dk`) er forældede
  (seedet hedder nu Grønkøbing) — rettes naturligt når README alligevel
  opdateres; ikke en driftsrisiko.

## Verifikation (fra denne session)

- `npm test`: **280 tests, alle grønne** (baseline før ændringer: 238).
- `npx tsc --noEmit`: ren.
- `npm run lint`: 0 fejl, 1 forudgående advarsel i uberørt fil
  (`lib/import/skabelon-roundtrip.test.ts`).
- `npm run build` (production): succesfuld; `/rapport/[token]` bygger som
  dynamisk side.
- esbuild-bundling af seed (samme kommando som Dockerfile): succesfuld.
