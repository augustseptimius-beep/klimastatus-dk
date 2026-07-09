# ARCHITECTURE.md — sådan virker klimastatus.dk faktisk

> Skrevet 2026-07-09 efter en fuld gennemlæsning af kodebasen i forbindelse med
> produktionshærdning. Målgruppe: en fremtidig vedligeholder (menneske eller
> model) der arver systemet koldt. Se også `DECISIONS.md` og `ROADMAP.md`.

## Hvad systemet er

Et MERL-værktøj (Monitorering, Evaluering, Rapportering, Læring) til danske
kommuners klimaplaner, struktureret om CCTF-rammeværket (16 kriterier,
Klimaalliancen). Multi-tenant SaaS: én database, én app-instans, 3-6 betalende
kommuner. Solo-vedligeholdt. Tre søjler: styring af handlinger (tiltag),
rapportering og indgang til relevant data.

## Stack og deploy-topologi

| Lag | Teknologi | Bemærkning |
|---|---|---|
| App | Next.js 16, App Router, Server Components + Server Actions | `output: 'standalone'`. **OBS:** Next 16 har breaking changes ift. ældre viden — læs `node_modules/next/dist/docs/` før ændringer. Middleware hedder `proxy.ts`, ikke `middleware.ts`. |
| DB | PostgreSQL 16 (pgvector-image, vector bruges ikke endnu) | Drizzle ORM, migrationsfiler i `db/migrations/` |
| Jobs | pg-boss 12 — kører **in-process** i Next-serveren | Startes fra `instrumentation-node.ts`. Ingen separat worker-proces. |
| Auth | JWT (jose, HS256) i httpOnly-cookies; argon2-passwordhash | To adskilte cookies: `session` (admin/koordinator) og `tovholder-session` |
| Email | Brevo (transaktionel) | `lib/email.ts` |
| AI | Anthropic API (claude-sonnet-4-6) til import af handlingskataloger | `lib/jobs/import-handlingskatalog.ts` |
| Hosting | Hetzner VPS, styret af **Coolify** (pull-and-run af GHCR-image) | Der bygges IKKE på serveren (gav OOM) |
| TLS/proxy | Caddy, wildcard `*.klimastatus.dk` | `Caddyfile` — alle subdomæner rammer samme app |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`): typecheck → test → lint → docker build → push GHCR → webhook til Coolify | Deploy-webhook går til Coolify over HTTP (se ROADMAP) |
| Backup | Dagligt kl. 02:00 UTC: pg_dump → rclone → Infomaniak Swiss Backup | `docs/backup-runbook.md`. Scriptet ligger PÅ SERVEREN (`/opt/backup/backup.sh`), ikke i repoet. |

**Vigtig drifts-detalje:** `docker-compose.prod.yml` i repoet er det Coolify
deployer, men backup-runbooken refererer til containere (postgres:18-alpine)
der ikke matcher compose-filen (pgvector:pg16). Stol på det, der faktisk kører
på serveren — verificér med `docker ps` — og hold runbooken ajour.

## Boot-sekvens (Dockerfile CMD)

```
node scripts/migrate.mjs      # Drizzle-migrationer. FEJL = container stopper (korrekt).
node scripts/seed-compiled.mjs # Konvergens/demo-seed. FEJL = logges, serveren starter ALLIGEVEL.
node server.js                # Next standalone. instrumentation-node.ts kører validerEnvVedStart()
                              # (lib/env.ts): fatale env-mangler stopper processen i produktion.
                              # Derefter startes pg-boss-queues + cron-schedules.
```

Seed (`db/seed.ts`, esbuild-bundlet i Docker-builden) er idempotent og kører
ved HVER opstart: CCTF-kriterier, admin-bruger, indikator-templates,
standardtiltag-katalog, omstillingsindikatorer og demo-kommunen Grønkøbing
(kommunekode 0657, subdomain `groenkobing` — Grønkøbings konfiguration
NULSTILLES ved hver boot). I produktion oprettes brugere KUN hvis
`ADMIN_PASSWORD`/`SEED_PASSWORD` er sat (se `lib/seed-guard.ts`), og
boot-tids-hentning fra eksterne API'er springes over.

## Auth-modellen — tre principaler

1. **Admin** (`role: 'admin'`): global adgang, styrer kommuner og
   indikator-templates. Session-JWT i `session`-cookien, 7 dage.
2. **Koordinator** (`role: 'koordinator'`): bundet til én kommune via
   `session.kommuneId`. Al adgang går gennem
   `requireKommuneContext(slug)` (`lib/kommune-context.ts`), der slår kommunen
   op på URL-slug og kræver `session.kommuneId === kommune.id` (admin må alt).
3. **Tovholder**: INGEN bruger i DB-forstand. Får et magic link pr. email,
   som indløses til en `tovholder-session`-JWT (7 dage). Kan kun besvare
   forespørgsler på egne tiltag (`app/rapport/`).

### Den vigtigste invariant i kodebasen

**Server actions er selvstændige POST-endpoints.** `proxy.ts` og layouts
beskytter dem IKKE — en action defineret under `/admin` kan kaldes uden at
`/admin`-layoutet nogensinde renderes. Derfor SKAL hver eneste
server action selv kalde én af:

- `requireAdmin()` (`lib/dal.ts`) — admin-actions
- `requireKommuneContext(slug)` — kommune-scopede actions, og derefter
  verificere at ALLE id'er fra klienten (tiltagId, tovholderId, kiId …)
  tilhører `kommune.id` før skrivning
- `decryptTovholder`/`verifyTovholderSession` — tovholder-actions, og
  verificere at forespørgslen tilhører `session.tovholderId`

Der findes en regressionstest-praksis for dette
(`app/admin/indikatorer/actions.test.ts` m.fl.) — følg den ved nye actions.

`proxy.ts` (Next 16's middleware) er kun et groft førstefilter: redirect til
/login uden session, redirect ikke-admins væk fra /admin. Matcheren udelukker
`/api` — API-routes (`app/api/`) laver deres egne tjek.

## Multi-tenancy

Én database, ingen Row Level Security. Tenant-isolation håndhæves udelukkende
i applikationslaget via `kommune_id`-kolonner og de tjek der er beskrevet
ovenfor. Næsten alle tabeller cascade-sletter fra `kommune` — **sletning af en
kommune-række sletter ALT kundens data**. Derfor kræver
`deleteKommuneAction` at kommunens navn indtastes og verificeres server-side.

Kommune-identitet i URL'er er **slug i path** (`/k/[kommune]/…`), ikke
subdomæne — Caddy'ens wildcard sender alle subdomæner til samme app, og
subdomænet bruges i praksis kun i magic-link-URL'er og på den offentlige side.

## Datamodel (kernen)

```
kommune ──< indsatsOmraade ──< maal
   │              │
   │              └──< tiltag ──< tiltagEffekt (delete+insert ved redigering)
   │                     │ ├──< tovholderTiltag >── tovholder
   │                     │ └──< indikatorTiltag >── indikator
   │
   ├──< monitoreringscyklus (unik pr. kommune+type+år; ensureAarligCyklus er race-sikker)
   ├──< kommuneIndikator ── indikatorTemplate (global, admin-ejet)
   │         └── indikator ──< indikatorMaaling (unik pr. indikator+cyklus; upsert ved API-hentning)
   ├──< forespoergsel (koordinator beder tovholder om status; status sendt/besvaret)
   ├──< tovholderRapport (svaret; upsert-nøgle = tovholder+tiltag+dato)
   ├──< laeringspost (MERL-læring, knyttet til tiltag/indsatsområde)
   ├──< drivhusgasregnskabPost (sektoropdelt CO₂e fra Klimaregnskabet)
   └──< importJob (AI-import; filindhold gemmes som base64/tekst I DATABASEN)

cctfKriterie (global, versionstagget, seedet v2.5) — dækning beregnes i lib/cctf/coverage-engine.ts
```

Indikator-arkitekturen er tre lag: **template** (global definition, admin) →
**kommuneIndikator** (kommunens aktivering af en template) → **indikator** +
**indikatorMaaling** (målinger pr. monitoreringscyklus/år). Templates har
`dataProvenans` (top_down = hentet fra API / bottom_up = lokalt indtastet).

## Kerneflowet: forespørgsel → magic link → rapport

1. Koordinator trykker "Indhent status" (pr. tiltag) eller "Send runde" (alle
   tovholdere). Der oprettes `forespoergsel`-rækker + et magic link pr.
   tovholder; email via Brevo. Email er best-effort — forespørgslen er kilden
   til sandhed, en mailfejl vælter ikke handlingen.
2. Magic link = 32 tilfældige bytes, **kun SHA-256-hashen gemmes**
   (`db/queries/magic-link.ts`), gyldigt 14 dage, engangs.
3. `GET /rapport/[token]` (`app/rapport/[token]/page.tsx`) er **uden side
   effects** — kommunale mailscannere (Outlook SafeLinks) forhåndshenter
   links, så indløsning sker først når mennesket klikker "Fortsæt til
   rapport" (POST → `indloesMagicLinkAction`). Indløsning markerer linket
   brugt og **overskriver altid** `tovholder-session`-cookien (delt
   kommune-computer må ikke give en andens identitet). Brugt/udløbet link +
   gyldig session → videre til /rapport; ellers → /rapport/udloebet.
4. Tovholder besvarer på `/rapport` → `tovholderRapport` upsertes +
   `forespoergsel` markeres besvaret.
5. Cron-jobbet `rykker` (dagligt 09:00) finder ubrugte, uudløbne links uden
   efterfølgende rapport og sender påmindelse (nyt link).

## Baggrundsjobs (pg-boss)

Registreres i `instrumentation-node.ts` når Next-serveren starter — i SAMME
proces. Fejler pg-boss-start (fx ingen DB i CI/preview) logges det og serveren
fortsætter. **Konsekvens: kør aldrig mere end én app-instans** uden at
gentænke dette — schedules ville blive registreret pr. instans.

| Queue | Cron | Gør |
|---|---|---|
| `rykker` | dagligt 09:00 | Påmindelses-emails til tovholdere |
| `fetch-klimaregnskabet` | månedligt d. 1. kl. 06 | CO₂e pr. kommune fra klimaregnskabet.dk (kræver `KLIMAREGNSKABET_API_KEY`) |
| `fetch-energidataservice` | månedligt | VE-kapacitet (vind/sol MW) |
| `fetch-dst` | månedligt | Befolkningstal (FOLK1A) |
| `import-handlingskatalog` | on demand | AI-udtræk af indsatser fra uploadet PDF/CSV/XLSX/DOCX |

Fetcherne er per-kommune-fejltolerante (fejl gemmes i
`kommuneIndikator.sidsteFejl` og vises i UI'et) og upserter målinger på
`(indikatorId, monitoreringscyklusId)`. "Hent nu"-knappen på `/data` enqueuer
samme jobs med `kommuneIndikatorId`.

AI-importen: fil uploades via `app/api/importer/enqueue/route.ts` (maks 15 MB;
tekstformater klippes til 60k tegn), gemmes i `importJob.filindhold`, jobbet
kalder Anthropic med tool-forced output, resultatet gemmes som JSON på jobbet,
og klienten poller `/api/importer/status/[jobId]`. Koordinatoren godkender
resultatet manuelt før noget oprettes.

## Offentlige sider

`/{slug}` (fx `/groenkobing`) renderer et widget-dashboard, KUN hvis
`kommune.publicEnabled`. Widgets (`lib/widgets/`) er en lille server-registry:
`klimamaal-hero`, `co2e-udvikling`, `noegletal`, `tekstblok`,
`indsatser-oversigt`. Konfiguration ligger i `kommune.publicWidgets` (jsonb)
og saneres mod definitioner ved render. Loaderne modtager kun `kommune.id` —
de kan ikke lække andre kommuners data, så længe de scoper deres queries.

## Miljøvariabler

Valideres ved serverstart i `lib/env.ts` (fatale mangler stopper produktions-
processen med tydelig log):

- **Fatale:** `DATABASE_URL`, `SESSION_SECRET` (≥32 tegn)
- **Advarsler (feature-degradering):** `BREVO_API_KEY` (ingen emails),
  `ANTHROPIC_API_KEY` (ingen AI-import), `KLIMAREGNSKABET_API_KEY` (ingen CO₂e-data)
- **Seed:** `ADMIN_PASSWORD`, `SEED_PASSWORD` — i produktion oprettes
  brugere ikke uden dem (`lib/seed-guard.ts`)

Secrets sættes i Coolify → Environment Variables og løber gennem
`docker-compose.prod.yml` til app-containeren.

## Fejlfinding kl. 22 en tirsdag

1. **Er siden nede?** `curl https://klimastatus.dk/api/health` — tjekker DB-
   forbindelsen. 503 = DB-problem, timeout = container/Caddy-problem.
2. **Logs:** Coolify UI → applikationen → Logs. Alt logger til stdout med
   præfikser: `[env]`, `[seed]`, `[migrate]`, `[jobs]`, `[fetch-*]`,
   `[sendRunde]`, `[indhentStatus]`.
3. **Starter containeren ikke?** Kig efter `[migrate]` (migrationsfejl =
   bevidst stop) eller `[env] FATAL` (manglende secret = bevidst stop).
   `[seed] FEJLEDE (non-fatal)` betyder at serveren kører videre uden seed.
4. **Ingen emails?** `[env] ADVARSEL` om BREVO_API_KEY, eller
   `[sendRunde]`/`[indhentStatus]`-fejllinjer. Forespørgslerne findes stadig
   i DB — tovholderne kan få nye links via "Send runde".
5. **Manglende API-data?** `/data`-siden viser `sidsteFejl` pr. indikator.
6. **Gendan databasen:** `docs/backup-runbook.md` — trinvis.

## Tests

Vitest, `npm test` — 280 tests, rene unit tests med mocks (ingen test-DB,
ingen E2E). Konvention: `*.test.ts` ved siden af koden. DB-queries testes med
mockede drizzle-kald; actions testes med mockede queries + auth-helpers.
CI kører typecheck + test + lint før hvert deploy.
