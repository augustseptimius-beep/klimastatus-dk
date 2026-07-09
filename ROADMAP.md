# ROADMAP.md — resterende svagheder i prioriteret rækkefølge

> Skrevet 2026-07-09. Hvert punkt har nok kontekst til at kunne samles op
> koldt. Prioriteret efter konsekvens for 3-6 betalende kommuner med en
> solo-vedligeholder — ikke efter kode-æstetik. Læs `ARCHITECTURE.md` først.

## 1. Uptime-overvågning + alarmering (drift, ingen kode)

**Problem:** Ingen ved at siden er nede, før en kommunal medarbejder ringer.
For risiko-averse offentlige kunder er "vi opdagede det selv og fiksede det"
forskellen på tillid og opsigelse.
**Løsning:** Ekstern uptime-monitor (fx UptimeRobot/Better Stack, gratis-tier
rækker) mod `https://klimastatus.dk/api/health` + én offentlig kommune-side.
Alarm til telefon/email. Health-endpointet findes allerede og tjekker DB.
**Indsats:** <1 time. Gør dette FØRST — højeste værdi pr. minut.

## 2. Backup-gendannelses-øvelse + runbook-drift

**Problem:** Backuppen har aldrig været gendannet på prøve (ingen evidens i
repoet), og `docs/backup-runbook.md` refererer til en anden Postgres-container
(postgres:18-alpine, bruger `postgres`) end `docker-compose.prod.yml`
(pgvector:pg16, env-styrede navne). Én af dem er forkert — den slags opdages
kl. 03 under en rigtig gendannelse.
**Løsning:** Kør en fuld restore til en tom container efter runbooken; ret
runbooken hvor den lyver; noter dato for øvelsen i runbooken. Overvej
`pg_restore --list`-verifikation i backup-scriptet + en alarm hvis dagens
dump mangler/er mistænkeligt lille (kobles til #1).
**Indsats:** en aften. Ingen kodeændringer i appen.

## 3. Transaktionel integritet på flertrins-skrivninger

**Problem:** `setTiltagTovholdere`/`setTiltagEffekter` (`db/queries/tiltag.ts`)
er delete-then-insert uden transaktion; `updateTiltagAction` kører
update + to gen-koblinger som separate statements; `upsertRapport`
(`db/queries/rapport.ts`) er read-then-write med et race-vindue. Et crash/
connection-tab midtvejs efterlader et tiltag uden tovholdere/effekter.
**Løsning:** Wrap i `db.transaction(async (tx) => …)`. Drizzle + postgres.js
understøtter det direkte. Mønster: lad query-funktionerne tage en valgfri
`tx`-parameter (default `db`), og lad actions åbne transaktionen.
`upsertRapport` kan i stedet bruge en unik constraint på
`(tovholder_id, tiltag_id, dato)` + `onConflictDoUpdate` (kræver migration —
tjek for eksisterende dubletter først).
**Indsats:** 2-4 timer inkl. tests.

## 4. Fejl-observabilitet (server-side)

**Problem:** Uncaught fejl i actions/pages ender som Next-500'ere; kun
`console.*` i Coolify-logs, ingen aggregering, intet signal når en kunde
rammer fejl. Solo-vedligeholderen opdager fejl via kunderne.
**Løsning (kedelig først):** (a) `app/global-error.tsx` + `error.tsx` med
venlig dansk besked og fejl-id; (b) én lille `lib/log.ts` der logger
struktureret JSON (timestamp, scope, fejl-id, kommune-slug) så Coolify-logs
kan greppes; (c) derefter evt. selfhostet GlitchTip/Sentry i EU (GDPR:
undgå at sende persondata til tredjeland).
**Indsats:** (a)+(b) en aften; (c) en dag.

## 5. `import_job`-tabellen vokser ubegrænset

**Problem:** Hver AI-import gemmer HELE filen (PDF som base64, op til ~20 MB
tekst) i `import_job.filindhold` — for evigt. Med aktive kunder æder det DB-
plads og gør backups tunge.
**Løsning:** Ryd `filindhold` (sæt til '') når job er `complete`/`failed` og
resultatet er gemt — det læses aldrig igen. Plus et lille pg-boss-cron der
sletter jobs ældre end fx 90 dage. Ingen skemaændring nødvendig.
**Indsats:** 1-2 timer inkl. test.

## 6. Produktbeslutning: engangs- vs. flergangs-magic-links

**Kontekst:** Links er nu engangs med POST-bekræftelse (se DECISIONS #4).
Tilbageværende friktion: tovholderen der klikker linket på telefonen og
senere på desktoppen får "udløbet" på maskine nr. 2 (sessionen findes kun
hvor linket blev indløst). Giver support-henvendelser.
**Mulighed:** Gør links gyldige til udløb (14 dage, flergangs). Husk:
`lib/jobs/rykker.ts` bruger `used=false` som "aktivt link"-signal — skift til
`firstUsedAt`-semantik eller rapport-baseret tjek. Sikkerhedstrade-off
(videresendte emails) skal ejeren aktivt beslutte. Alternativ: behold engangs,
men lad koordinatoren se/gensende links fra UI'et.

## 7. Udskift `xlsx`-pakken

**Problem:** `npm audit`: prototype pollution + ReDoS i `xlsx` (SheetJS fra
npm er forladt — ingen fix). I dag parser den kun uploads fra indloggede
koordinatorer, så eksponeringen er begrænset, men det er præcis den slags
fund en kommunal sikkerhedsgennemgang standser indkøb på.
**Løsning:** Skift til `exceljs` (eller SheetJS' egen CDN-distribution) i
`app/api/importer/enqueue/route.ts` — eneste brugssted; den laver bare
sheet→CSV-tekst. Ryd også de øvrige 12 audit-fund (mest transitive).
**Indsats:** 2-3 timer inkl. test med en rigtig xlsx-fil.

## 8. Deploy-kædens svage punkter

- Coolify-webhooken i `.github/workflows/deploy.yml` kaldes over **HTTP** mod
  en hardcodet IP med Bearer-token — token kan sniffes on-path. Sæt TLS på
  Coolify-endpointet (eller kør webhooken via Tailscale/SSH) og flyt URL'en
  til en secret.
- Ingen migrations-rollback-strategi: Drizzle kører kun fremad. Reglen "kun
  additive migrationer" (aldrig drop/rename i samme release som koden) bør
  stå i AGENTS.md, så også AI-agenter overholder den.
- `scripts/seed-compiled.mjs` er tjekket ind i repoet, men genereres af
  Docker-builden — slet den fra git for at undgå forvirring om hvad der kører.

## 9. Skaleringsantagelsen: én app-instans

**Problem:** pg-boss kører in-process, cron-schedules registreres pr.
instans, og login-rate-limiteren er in-memory. ALT dette er fint ved én
instans — og går subtilt i stykker ved to (dobbelte rykker-emails er den
synligste skade).
**Løsning (når behovet opstår, ikke før):** separat worker-container
(`node worker.js` med pg-boss), og rate limit i Postgres. Indtil da: skriv
antagelsen ind i AGENTS.md, så ingen (menneske eller agent) skalerer til to
replicas i god tro.

## 10. GDPR/databehandler-hygiejne (salgsblokerende, ikke teknisk)

Kommuner SKAL have en databehandleraftale før go-live. Systemet gemmer
persondata: tovholder-navne/-emails, brugere, fritekst i rapporter (kan
indeholde personoplysninger). Hosting: Hetzner (DE), backup: Infomaniak (CH,
adekvat land), email: Brevo (FR/EU), AI: Anthropic (US — importerede
handlingskataloger sendes dertil; det skal stå i DPA'en, og/eller der skal
kunne fravælges AI-import pr. kunde). Lav en databehandlerfortegnelse + DPA-
skabelon før første rigtige kunde. Teknisk støtte: eksport af al en kommunes
data (JSON/CSV) er også et godt salgsargument.

## 11. Småting (tag dem når du er i nærheden)

- `README.md` nævner Neon Serverless og Østerby-login — begge forældede.
- Timing-baseret bruger-enumeration i login (manglende bruger springer
  argon2-verify over) — kør en dummy-verify for ens svartid.
- `lib/jobs/fetch-*`: `fetch()` uden timeout — tilføj
  `signal: AbortSignal.timeout(20_000)` så et hængende eksternt API ikke
  blokerer en pg-boss-worker i timevis.
- `standardSkabelon()`-widgets på offentlige sider når `publicWidgets` er
  tom: bevidst? En kommune der aktiverer `publicEnabled` uden opsætning viser
  straks et standard-dashboard.
- Migration 0011 hedder `thisted_kommunekode` — bekræfter at rigtige
  kommuner (Thisted) allerede har rørt systemet; behandl produktions-DB'en
  derefter.
