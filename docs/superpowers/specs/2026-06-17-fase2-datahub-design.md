# Fase 2 — Datahub (provenance) — design

**Dato:** 2026-06-17
**Status:** Design til godkendelse → writing-plans
**Bygger på:** `docs/superpowers/specs/2026-06-15-datadrevet-cctf-platform-design.md` (Fase 2) + evidensgrundlag `2026-06-16-cctf-evidensgrundlag.md` §4.2 (indikator-typologi), §6.6 (top-down vs bottom-up).

---

## 0. Den bærende beslutning (value-first, afgrænset)

Design-doc'ens Fase 2 bundtede tre ting: indikator-metadata, to-lags-serier, og BBR som ny datakilde. Ved gennemgang af den faktiske data (brainstorm 2026-06-17) blev fasen skåret til sin værdifulde kerne:

**Den ubehagelige, værdifulde indsigt:** næsten al eksisterende data er reelt **top-down** — Klimaregnskab (CO₂e), DST (befolkning), Energidata er nationale registre/modeller skaleret til kommunen. Den ægte **bottom-up** styringsdata er de manuelt indtastede indikatorer. At gøre det skel synligt rammer princip 2 direkte (*"national data informerer i mindre grad om udviklingen lokalt"* `[§6.6]`) og kalibrerer koordinatorens tillid til hvert tal.

**Fase 2 = provenance-disciplin + gør Fase 1's benchmark synlig.** Ikke metadata-bureaukrati.

### Skåret / delt / udskudt

| Element | Beslutning | Begrundelse |
|---|---|---|
| **BBR som datakilde** | **Eget næste skridt (Fase 2b)** | Ekstern integration af anden karakter; kræver sandsynligvis Datafordeler-credentials (modsat de åbne API'er i dag). Verificér adgang *før* commit — ikke i blinde. |
| **5 kvalitetskriterier** (repræsentation/komplethed/pålidelighed/målbarhed/økonomi) | **Skåret** | At score hver indikator på 5 dimensioner er compliance-dekoration uden daglig værdi (samme slags vi skar i Fase 3). |
| **Friskhed-metadata** | **Allerede gjort** | Datafriskheds-laget (Fase 3) dækker det. Genopbygges ikke. |
| **Fulde to-serie-tidsserier** (national modelleret trajektorie) | **Skåret** | Den data findes ikke. "Top-down" = Fase 1's nationale benchmark (én målværdi), ikke en tidsserie. |
| Øvrige dikotomier (direkte/indirekte, kvantitativ/kvalitativ) `[§4.2]` | **Skåret** | Lav daglig værdi. Beholder kun de to brugbare: top-down/bottom-up + aggregeret/operationel. |

---

## 1. Provenance-modellen

To rene felter der beskriver **hvilken slags data** en indikator-template bærer. De lever på `indikator_template` (hvor `kilde`, `niveau`, `sektor`, `nationalMaalvaerdi` allerede bor — provenance er katalog-niveau-metadata). Begge nullable (ukendt → intet badge, ingen falsk påstand).

- **`dataProvenans`** enum `['top_down', 'bottom_up']`
  - `top_down` = national/modelleret/registerdata skaleret til kommunen → *kontekst & benchmark*, ikke noget man styrer efter lokalt.
  - `bottom_up` = lokal/operationel data tovholderne faktisk leverer → *styring*.
- **`dataKarakter`** enum `['aggregeret', 'operationel']`
  - `aggregeret` = fx samlet CO₂-regnskab. `operationel` = fx antal konverterede oliefyr.

### Seed-defaults for eksisterende templates (`db/seed.ts`)
- Klimaregnskab (CO₂e): `top_down` · `aggregeret`
- Energidataservice (VE-kapacitet): `top_down` · `aggregeret`
- DST (befolkning): `top_down` · `aggregeret`
- De 9 omstillingsindikatorer: `bottom_up` · `operationel` — kommunen indtaster sin egen lokale værdi (ingen API-kilde), så det ER styringsdata; `nationalMaalvaerdi` er den top_down benchmark, der vises ved siden af. (Dette er to-lags realiseret: bottom_up serie + top_down benchmark.)
- Fremtidige manuelt indtastede indikatorer defaulter til `bottom_up` · `operationel`.

**Regel (konsistent overalt):** kilde sat (API) → `top_down`; kilde fraværende (lokal indtastning) → `bottom_up`. Samme regel i seed og ved oprettelse.

Migrationen er additiv (to nullable kolonner + to enums), ikke-destruktiv — som Fase 1's mønster.

---

## 2. Visning (hvor disciplinen bliver synlig)

### 2.1 Tillids-badge på /data
Hver aktiv indikator får et badge i indikator-tabellen (`app/(app)/k/[kommune]/data/page.tsx`):
- `top_down` → neutralt/blåt badge **"National kontekst"** (evt. + "aggregeret").
- `bottom_up` → grønt badge **"Lokal styring"** (evt. + "operationel").
- Ukendt (null) → intet badge.

Formål: koordinatoren ser med ét blik hvad de kan **styre på** vs. hvad der bare er **national baggrund**. Sprog er kalibrering, ikke dom.

### 2.2 Benchmark synlig (den billige, konkrete payoff)
For en adopteret indikator der har en `nationalMaalvaerdi` (Fase 1-omstillingsindikatorerne), vis inline ved siden af kommunens seneste værdi:
- *"Jeres: 18.200 GWh/år · National målværdi: 27.000 (67%)"*

Det gør Fase 1's benchmark-data **synlig og brugbar for første gang** — "lokal + national side om side" gjort konkret, uden ny charting. (Den *rige* sektorkorrigerede peer-sammenligning forbliver Fase 5; her er det kun en simpel side-om-side.)

---

## 3. Arkitektur

Designet for isolation:

- **Schema:** `db/schema/enums.ts` (+2 enums), `db/schema/indikator-template.ts` (+2 nullable kolonner). Migration via `drizzle-kit generate`.
- **Provenance-helper (ren logik):** `lib/datahub/provenans.ts` — labels + en lille `benchmarkProcent(vaerdi, maalvaerdi)`-funktion (testbar; null-sikker, ingen division med 0/null). Holder visnings-/beregningslogik ude af page-laget.
- **Query:** udvid den eksisterende /data-query så den henter `dataProvenans`, `dataKarakter`, `nationalMaalvaerdi` med (de joines allerede fra `indikator_template`).
- **UI:** lille `components/datahub/provenans-badge.tsx` + benchmark-visning inline i /data-tabellen.
- **Seed:** sæt provenance på de eksisterende template-seed-blokke (idempotent, som i dag).
- **Oprettelse:** når en manuel indikator/template oprettes, default `bottom_up`/`operationel`.

Ingen ændring i fetch-jobs (BBR er udskudt). Ingen ny charting.

---

## 4. Out of scope

- **BBR / nye datakilder** → Fase 2b (verificér Datafordeler-adgang først).
- **5 kvalitetskriterier, øvrige dikotomier** → skåret.
- **Friskhed** → Fase 3 (gjort).
- **Sektorkorrigeret peer-benchmarking / ambitions-tjek** → Fase 5.
- **Redigér provenance via kommune-UI** → admin/seed-niveau er nok nu; ingen tovholder-redigering.
- **Fuld dual-serie-charting** → ikke nu (mangler national tidsserie-data).

---

## 5. Testning

- **Ren helper:** `benchmarkProcent` testes mod kendte værdier + null/0-grænser (ingen falsk procent, ingen NaN).
- **Provenance-labels:** mapping enum → dansk label testes.
- **Seed-data:** test at de eksisterende template-seeds har en gyldig `dataProvenans` (ingen kilde uden provenance efter seed).
- **Migration:** additiv, ikke-destruktiv (kun ADD COLUMN + CREATE TYPE).

## 6. Succeskriterier

- [ ] `indikator_template` har `dataProvenans` + `dataKarakter`; alle seedede templates har værdier.
- [ ] /data viser et tillids-badge ("National kontekst" / "Lokal styring") pr. indikator.
- [ ] En adopteret benchmark-indikator viser "jeres værdi vs. national målværdi (%)" inline.
- [ ] Manuelt oprettede indikatorer markeres `bottom_up`/`operationel`.
- [ ] Migration er additiv; ingen falske benchmark-procenter ved manglende data.
- [ ] BBR er dokumenteret som Fase 2b med adgangs-verifikation som første skridt.
