# Lagdelt kommune-adgang — URL-scoped arbejdsflade (Design)

> **Status:** Godkendt design, klar til implementeringsplan.
> **Dato:** 2026-06-04

## Formål

Indfør et eksplicit, lagdelt adgangssystem så:

- **Admin** har adgang til *alle* kommuner og kan arbejde i hvilken som helst af dem.
- **Koordinator** har adgang til præcis *én* kommune — sin egen — og kan hverken se eller nå andre kommuner.

Den kommune man arbejder på bestemmes af **adressen** (URL), ikke af sessionen. Det gør hver browser-fane uafhængigt låst til sin kommune, så en admin kan have flere kommuner åbne samtidig uden risiko for at redigere den forkerte kundes data.

## Baggrund / nuværende tilstand

- `SessionPayload` har allerede `role: 'admin' | 'koordinator'` og `kommuneId: string | null`.
- Koordinatorer er reelt allerede låst: middleware (`proxy.ts`) spærrer `/admin/*`, og queries scopes til `session.kommuneId`.
- Admin kommer i dag ind i en kommune via `switchKommuneAction`, som **overskriver** sessionens `kommuneId` (beholder `role: 'admin'`) og sender til `/dashboard`.

**Problemerne med den nuværende model:**

1. **Fane-kollision:** Fordi "hvilken kommune" bor i sessionen (én værdi pr. browser), kan en admin med to faner åbne på to kommuner komme til at redigere den forkerte — usynligt.
2. **Forvirrende bounce:** Navigerer admin direkte til en arbejds-rute uden først at have valgt en kommune (`kommuneId: null`), sender app-layoutet til `/login`, hvorfra middleware sender admin videre til `/admin/kommuner`. En uigennemskuelig omvej.
3. **Spredt håndhævelse:** Adgangstjek er gentaget som `if (!session?.kommuneId)` rundt i mange filer i stedet for ét centralt sted.

## Arkitektur

### Tre adresse-"verdener"

| Verden | Adresse | Hvem | Status |
|--------|---------|------|--------|
| Offentlig (borgere) | `klimastatus.dk/<slug>` | Alle | Uændret |
| Arbejdsflade | `klimastatus.dk/k/<slug>/...` | Admin + koordinator | Ny |
| Admin-oversigt | `klimastatus.dk/admin/kommuner` | Kun admin | Stort set uændret |

- `<slug>` er kommunens **subdomæne** (fx `groenkobing`) — læsbart, allerede unikt, allerede brugt offentligt. Ikke UUID.
- `/k/`-præfikset holder arbejdsfladen adskilt fra den offentlige `/<slug>`-rute, så de aldrig kolliderer.
- `k` tilføjes til `reservedSegments` i `proxy.ts` (så `/k` ikke fejltolkes som et offentligt slug).

### Centralt adgangs-tjek

Ét helper-modul — `requireKommuneContext(slug)` (server-only) — som hver arbejds-side og -handling kalder:

1. Verificér session (ellers → `/login`).
2. Slå kommune op ud fra `slug`.
3. **Adgangstjek:**
   - `admin` → adgang til enhver eksisterende kommune.
   - `koordinator` → adgang kun hvis `session.kommuneId === kommune.id`.
4. Returnér `{ session, kommune }`. Alt downstream scopes til `kommune.id`.

Afviste tilfælde:
- Ukendt slug → `notFound()` (404).
- Koordinator mod fremmed kommune → `notFound()` (ingen lækage om at andre kommuner findes).
- Ingen session → redirect til `/login`.

Dette erstatter de spredte `session.kommuneId`-tjek. Server-handlinger må **ikke** længere stole på `session.kommuneId` (admins har den ikke sat) — de modtager `slug` og resolver+tjekker via samme helper.

### Session-ændringer

- Tilføj `kommuneSlug: string | null` til `SessionPayload`:
  - `koordinator` → deres egen kommunes subdomæne.
  - `admin` → `null`.
- Formål: login og "allerede logget ind"-redirect kan sende koordinator præcist til `/k/<slug>/dashboard` uden et ekstra DB-opslag i middleware.
- `switchKommuneAction` (session-overskrivning) **fjernes** — kommunen bor nu i adressen. Admins session behøver ikke længere kende en "aktuel kommune".

### Login- og redirect-flow

- Efter login: `admin` → `/admin/kommuner`; `koordinator` → `/k/<egen-slug>/dashboard`.
- `/login` mens man er logget ind: samme mål som ovenfor.
- Bagudkompatibilitet: en tynd `/dashboard`-rute (uden præfiks) resolver sessionen og videresender — koordinator til `/k/<slug>/dashboard`, admin til `/admin/kommuner`. Dækker gamle bogmærker.

### Middleware (`proxy.ts`)

- `/admin/*` → kun `admin` (uændret).
- `/k/*` → kræver gyldig session; den finkornede ejerskabskontrol (er denne koordinator ejer af denne kommune?) sker i `requireKommuneContext`, da middleware ikke nemt kan resolve slug→kommune på edge.
- `/login` mens logget ind → redirect med præcist mål (bruger `kommuneSlug` fra session).
- Tilføj `k` til `reservedSegments`.

## Arbejdsflow (UX)

### Admin

1. **Log ind** → `/admin/kommuner` (kontrolrum).
2. **Oversigt:** tabel over alle kommuner (navn, kommunekode, subdomæne, offentlig til/fra). Pr. række:
   - **"Åbn arbejdsflade →"** → `/k/<slug>/dashboard` (almindeligt link; cmd-klik = ny fane, nu sikkert).
   - **"Se offentlig side"** → `/<slug>` i ny fane.
   - "Opret kommune" (uændret).
3. **Inde i arbejdsfladen** (`/k/<slug>/dashboard`), toppen viser:
   - **Stort kommune-navn + kommunens `primaryColor` som accent** (tilføjelse #1) — tydeligt hvilken kunde der redigeres.
   - Diskret "Forvalter som administrator".
   - **"← Alle kommuner"** → `/admin/kommuner`.
4. **Sidebar** bærer automatisk `/k/<slug>/`-præfikset på alle links.
5. **Flere kommuner samtidig:** hver i sin fane (`/k/groenkobing/...`, `/k/herning/...`), hver med eget navn/farve i toppen. Ingen kollision.

### Koordinator

1. **Log ind** → direkte til `/k/<egen-slug>/dashboard`.
2. Samme arbejdsflade, men **ingen "Alle kommuner"-link** og ingen kommune-skifter.
3. `/admin/*` spærret; `/k/<anden-slug>/...` → 404.

### Tilføjelse #1 — synlig aktiv kommune

Topbaren i arbejdsfladen viser konstant det aktive kommune-navn stort, med kommunens egen farve som accent (bjælke/prik), så forskellige kunder ser visuelt forskellige ud. For admin desuden et "Forvalter som administrator"-mærke + tilbage-link.

### Tilføjelse #2 — centralt adgangslag

`requireKommuneContext` er det ene håndhævelsespunkt. Alle `/k/[slug]/`-sider kalder det øverst; alle arbejds-handlinger re-tjekker via det med slug fra klienten (aldrig stol på klienten).

## Omlægning (migration)

Stor men mekanisk — egner sig til subagent-drevet eksekvering.

**Ruter der flytter** fra `app/(app)/<rute>` til `app/(app)/k/[kommune]/<rute>`:

- `dashboard/`
- `indsatser/` (inkl. `[id]/rediger/`, `ny/`, `importer/`, `actions.ts`)
- `tiltag/` (inkl. `[id]/rediger/`, `ny/`, `actions.ts`)
- `tovholdere/` (inkl. `[id]/`, `ny/`, `actions.ts`)
- `data/` (inkl. `actions.ts`)
- `laering/` (inkl. `actions.ts`)
- `selvevaluering/` (inkl. `preview/`, `actions.ts`)
- `indstillinger/` (inkl. `dashboard/` composer + `actions.ts`)
- `layout.tsx` (arbejdsflade-rammen med topbar + sidebar)

**Pr. side:** læs `params.kommune`, kald `requireKommuneContext(slug)`, brug `kommune.id`.
**Pr. handling:** modtag `slug` (bundet arg eller skjult felt), kald guard, brug `kommune.id`.
**Sidebar/links:** alle interne `<Link href>`/`redirect` får `/k/<slug>`-præfiks (sidebar tager `slug` som prop).
**Composer-link** (`indstillinger` → `dashboard`) opdateres tilsvarende.

**Ikke berørt:**
- Offentlig `/<slug>` og dens widget-system.
- `/admin/*` (kun: erstat `switchKommuneAction`-knappen med almindeligt link; tilføj "Se offentlig side").
- `/rapport/*` (token-baseret, offentlig).
- `/api/importer/*`, `/api/health` (tager eksplicitte ID'er / er uafhængige).
- `proxy.ts` matcher (kun logik-justeringer som beskrevet).

## Fejlhåndtering

- Ukendt kommune → 404 (`notFound()`).
- Koordinator mod fremmed kommune → 404.
- Udlogget bruger på `/k/...` → `/login`, derefter tilbage.
- Kommune uden data → eksisterende tomme tilstande på siderne dækker det.

## Test

- **Unit-tests for `requireKommuneContext`:**
  - admin + vilkårlig kommune → ok.
  - koordinator + egen kommune → ok.
  - koordinator + fremmed kommune → afvist (404).
  - ingen session → afvist (redirect).
  - ukendt slug → afvist (404).
- Eksisterende tests holdes grønne; tests der hævder på `session.kommuneId` opdateres til den nye kontekst-model.
- `npm run build` verificerer rute-flytning og server/klient-grænser.

## Bevidste afgrænsninger (YAGNI)

- Ingen kommune-skifter-dropdown (tilføjelse til #3-modellen blev fravalgt — vi gik med #2/URL-model).
- Ingen finkornede per-bruger-rettigheder ud over de to roller.
- Ingen migrering af `/api/importer/*` til kommune-præfiks (de bruger eksplicitte ID'er).
- Bagudkompatible redirects begrænses til de mest sandsynlige bogmærker (`/dashboard`, evt. `/indstillinger`).
