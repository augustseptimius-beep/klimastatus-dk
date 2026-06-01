# Fase 5 — Offentligt klimadashboard

**Dato:** 2026-06-01  
**Status:** Godkendt, klar til implementeringsplan

---

## Formål

Et live, offentligt tilgængeligt klimadashboard per kommune på `klimastatus.dk/[slug]`. Målgruppe er borgere, interessenter, NGO'er og byrådsmedlemmer der vil følge kommunens klimaindsats løbende. Det er *ikke* en erstatning for det byrådsrettede PDF-dokument (det eksisterende rapport-flow), men en borgervendt transparensside der er levende hele året.

Understøtter direkte CCTF kriterie 16 (offentlig rapportering).

---

## Afgrænsninger

- Ingen nye DB-migrations til selve dashboardet — én migration til tre konfigurationsfelter på `kommune`
- Kun læsning fra eksisterende tabeller
- Ingen login, ingen auth
- Klimastatus.dk-branding (kommune-branding er en triviel fremtidig tilføjelse — felterne `logoUrl`, `primaryColor`, `secondaryColor` er allerede i `kommune`-tabellen)

---

## URL & routing

**URL:** `klimastatus.dk/thisted` (path-baseret, ingen årstal i URL)

**År-navigation:** query param `?aar=2024`. Default = seneste år med indikatordata. Siden er delbar per år uden at have en separat side.

**Nye filer:**
```
app/(public)/
  layout.tsx
  [slug]/
    page.tsx
```

**Middleware (`proxy.ts`):** tilføj `isPublicSlug(path)` — returnerer `true` for paths der matcher `/^\/[a-z-]+$/` og ikke er i den eksisterende reserved-liste (`/login`, `/admin`, `/rapport`, osv.). Siden returnerer selv 404 for ukendte slugs.

**Caching:** Next.js ISR med `export const revalidate = 3600`. Max 1 times staleness, nul DB-load fra borgertrafik i mellemtiden.

---

## Sidestruktur

Siden er et async Server Component. Fire primære blokke:

### 1. Klimamål-hero
- Kommunens navn og mål-år (fra `kommune.klimakommitmentDato` — udtrækkes som `new Date(dato).getFullYear()`; nullable, vises kun hvis sat)
- Seneste CO₂e-tal og et simpelt trendgraf: basisår → seneste år → mål-år
- Farvekodet: grøn hvis kurven peger mod målet, gul/rød hvis ikke
- Svarer på ét blik: "Er vi på sporet?"

### 2. Koordinator-valgte nøgletal (3–5 slots)
- Koordinatoren konfigurerer hvilke indikatorer der fremhæves (VE-kapacitet, CO₂e pr. capita, elbiler per 1000 indbyggere, fjernvarmeprocent, m.fl.)
- Hentes fra `kommune_indikator` + `indikator_maaling`
- Konfiguration: `publicHighlights` JSONB-felt på `kommune`

### 3. Tiltag-status med opmærksomhedsflag
- Fordeling planlagt / igangsat / gennemført / kræver opmærksomhed
- "Kræver opmærksomhed" = status `in_progress` og ingen tovholder-rapport inden for `publicStaleDays` dage, eller `status = 'planned'` og ingen rapport overhovedet
- Stagnationsgrænse konfigureres af koordinatoren (default 90 dage)
- Stagnerede tiltag kan *ikke* skjules (det er pointen), men koordinatoren kan tilføje en fritekst-forklaring der vises offentligt

### 4. Indsatsområder
- Sektorer med antal aktive tiltag
- Giver borgeren sektorbilledet uden detaljer

### CCTF-dækning (sekundær, fold-ud)
- De 16 kriterier med komplet/delvis/manglende-status
- Relevant for NGO'er og interessenter
- Ikke frontpage-indhold for den almene borger

---

## Stagnationsquery

```sql
SELECT t.*
FROM tiltag t
WHERE t.kommune_id = $1
  AND t.status = 'in_progress'
  AND (
    (
      SELECT MAX(tr.created_at)
      FROM tovholder_rapport tr
      WHERE tr.tiltag_id = t.id
    ) < NOW() - INTERVAL '{publicStaleDays} days'
    OR NOT EXISTS (
      SELECT 1 FROM tovholder_rapport tr WHERE tr.tiltag_id = t.id
    )
  )
```

Implementeres som en ny query-funktion i `db/queries/`.

---

## Koordinator-konfiguration

Placering: ny undersektion på eksisterende `/indstillinger`-side ("Offentlig side").

**Hvad koordinatoren kan:**
- Vælge 3–5 fremhævede indikatorer fra kommunens aktive `kommune_indikator`-liste
- Sætte stagnationsgrænse (antal dage, default 90)
- Aktivere/deaktivere den offentlige side (toggle — siden returnerer 404 når inaktiv)
- Åbne preview-link (`klimastatus.dk/[slug]`) i ny fane

**DB-migration — tre nye felter på `kommune`:**

| Felt | Type | Default |
|---|---|---|
| `public_highlights` | JSONB (nullable) | null |
| `public_stale_days` | integer (nullable) | 90 |
| `public_enabled` | boolean | false |

---

## Data flow (server component)

```
request: GET /thisted?aar=2024
  │
  ├─ lookup kommune WHERE subdomain = 'thisted'
  │    └─ not found OR public_enabled = false → 404
  │
  ├─ resolve år (searchParams.aar ?? seneste år med data)
  │
  └─ Promise.all([
       CO₂e tidsserie (klimaregnskab-indikatorer for kommunen),
       publicHighlights-indikatorer med seneste måling,
       tiltag med stagnationscheck,
       indsatsområder med tiltag-count,
       CCTF-dækning,
     ])
```

---

## Layout

`app/(public)/layout.tsx` — lean, ingen sidebar, ingen auth:
- Klimastatus.dk-logo øverst til venstre
- Kommunenavn
- Årstogs-toggle øverst til højre
- Samme designsystem (CSS-variabler, Rubik) som resten af appen

---

## Hvad dette IKKE er

- En erstatning for byråds-PDF (det er det eksisterende rapport-flow)
- Et login-beskyttet koordinatorværktøj (det er `/dashboard`)
- En historisk arkivside per år (det er query param på én side)

---

## Fremtidige udvidelser (ikke i scope nu)

- Kommune-branding via `logoUrl`/`primaryColor` (felterne er allerede i schema)
- National oversigt på `/kommuner` med alle aktive kommuner
- Benchmarking på tværs af kommuner (V3 per datamodel-doc)
- Custom domain: `klima.thisted.dk` → CNAME til klimastatus.dk
