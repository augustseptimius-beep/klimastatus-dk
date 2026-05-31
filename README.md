# klimastatus.dk

Et digitalt MERL-system til danske kommuners klimaplaner — designet til CCTF-certificering (Climate Change Task Force, Klimaalliancen).

**Status:** Under aktiv udvikling. Demo-deadline: 1. september 2026.

---

## Hvad det er

klimastatus.dk samler klimaplanens monitorering, evaluering, rapportering og læring (MERL) ét sted:

- **Koordinatoren** administrerer indsatsområder, tiltag og mål, tilknytter tovholdere og følger CCTF-dækning live
- **Tovholdere** indberetter status via et unikt tokenlink — ingen login nødvendig
- **Auto-evaluering** beregner dækningsgrad pr. CCTF-kriterie (1-16) ud fra kommunens data
- **Selvevaluering** genereres direkte i systemet og kan eksporteres som PDF
- **Dataindhentning** trækker CO₂-regnskab, VE-kapacitet og demografidata automatisk fra offentlige API'er

Licens: **AGPL-3.0** — open core/hosted SaaS-model (samme model som Kausal, GitLab, Sentry).

---

## Tech stack

| Lag | Teknologi |
|-----|-----------|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Database | PostgreSQL via Neon Serverless |
| ORM | Drizzle ORM |
| Jobs | pg-boss (asynkrone dataindhentningsjobs) |
| Auth | JWT-cookies, argon2 password-hashing |
| Tests | Vitest |
| Deployment | Docker + Caddy på Hetzner VPS |

---

## Kom i gang (lokal udvikling)

```bash
# 1. Klon og installér
npm install

# 2. Kopiér og udfyld miljøvariabler
cp .env.example .env.local
# Sæt DATABASE_URL (Neon eller lokal Postgres)

# 3. Kør migrationer
npx drizzle-kit migrate

# 4. Seed demo-data (Østerby Kommune)
npx tsx db/seed.ts

# 5. Start udviklingsserver
npm run dev
```

Login med `koordinator@oesterby.dk` / `oesterby2026!` (seed-data).

---

## Projektstruktur

```
app/
  (app)/          Koordinator-app (beskyttet)
  (auth)/         Login
  (admin)/        Admin (kommuner, indikatorer)
  rapport/        Tovholder-flow (tokenlink, ingen login)
components/
  cctf/           CCTF-dækningsgrad-komponenter
db/
  schema/         Drizzle-skema (alle tabeller)
  migrations/     SQL-migrationer
  queries/        DB-queries pr. domæne
  seeds/          Seed-data (Østerby Kommune)
lib/
  cctf/           Coverage-engine, selvevaluerings-typer
  merl/           Læringspost-typer (Fase 4)
docs/
  superpowers/    Planer og design-specs pr. fase
```

---

## Faser (roadmap)

| Fase | Indhold | Status |
|------|---------|--------|
| 0 | AI-import via pg-boss | Færdig |
| 1 | Seed Østerby Kommune | Færdig |
| 2 | CCTF-lag (16 kriterier, dækningsgrad, mapping-UI) | Færdig |
| 3 | Selvevaluering (redigér, godkend, eksportér) | Færdig |
| 4 | MERL-lag (Læringspost, Beslutningsport) | Næste |
| 5 | Dashboard-polish | Planlagt |
| 6 | Resterende dataindhentning (BBR, DMI, KAMP) | Planlagt |

Se [docs/superpowers/specs/2026-05-21-roadmap-design.md](docs/superpowers/specs/2026-05-21-roadmap-design.md) for detaljer.

---

## Datamodel og MERL-arkitektur

- [klimastatus-dk-datamodel.md](klimastatus-dk-datamodel.md) — kerneentiteter, CCTF-mapping, MERL-lag
- [app-logik.mermaid](app-logik.mermaid) — flowdiagram over app-arkitektur

---

## CCTF-version

Systemet understøtter CCTF v2.5. Kriterier gemmes som versionstagget DB-records og kan opdateres via admin-UI uden kodeændring.
