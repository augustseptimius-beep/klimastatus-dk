# Læring fra Kausal-kodebasen

Kausal Oy er et finsk firma med 70+ betalende kommuner og byer på 3 kontinenter. De bygger klimaplan-monitorering og emissionsscenarier til byer — samme produktkategori som klimastatus.dk, men generisk og global frem for dansk og CCTF-specifik.

Alle Kausals open source repos er udgivet under **AGPL-3.0**, ligesom klimastatus.dk. Det betyder vi lovligt kan læse og genbruge kode direkte.

## Relevante repos

| Repo | Beskrivelse | Link |
|---|---|---|
| `kausal-watch` | Django-backend: action plans, kriterier, indikatorer | https://github.com/kausaltech/kausal-watch |
| `kausal-watch-ui` | Next.js frontend til Watch-platformen | https://github.com/kausaltech/kausal-watch-ui |
| `kausal-paths` | Python-backend til emissionsscenariering | https://github.com/kausaltech/kausal-paths |
| `kausal-paths-ui` | Next.js frontend til Paths | https://github.com/kausaltech/kausal-paths-ui |
| `nzc-data-studio` | NetZeroPlanner Data Studio — Next.js app til datainput fra byer (EU Net Zero Cities) | https://github.com/kausaltech/nzc-data-studio |
| `kausal-ui-common` | Delte React/TypeScript-komponenter | https://github.com/kausaltech/kausal-ui-common |

## Tre kernemønstre i Kausals datamodel

### 1. `AttributeType` + `Attribute` — runtime-konfigurerbare felter

Kausal har et EAV-system (Entity-Attribute-Value) hvor admins kan definere nye felttyper i UI'et uden database-migrations. Formater: `ordered_choice`, `text`, `rich_text`, `numeric`, `category_choice`.

Relevant kode:
- [`actions/models/attributes.py`](https://github.com/kausaltech/kausal-watch/blob/main/actions/models/attributes.py) — `AttributeType` (linje 81+), `Attribute` base-klasse (linje 280+), `ModelWithAttributes` mixin (linje 496+)

**Lærings-pointer for klimastatus.dk:** Vi behøver ikke det fulde EAV-system — vi har én fast ramme (CCTF) og kendte felter. Men idéen om et `format`-felt på attributter (så man kan have tekst, tal, valg osv.) er værd at adoptere i en simplere Drizzle-tabel.

---

### 2. `Category` + `CategoryType` — hierarkisk taksonomi til kriterier og sektorer

Kategorier er typede og hierarkiske. En `CategoryType` svarer til "CCTF-kriterier" som gruppe; de 16 `Category`-rækker er de individuelle kriterier. Understøtter niveauer (`CategoryLevel`) og ikoner.

Relevant kode:
- [`actions/models/category.py`](https://github.com/kausaltech/kausal-watch/blob/main/actions/models/category.py) — `CategoryType` (linje 125+), `Category` (linje 521+), `CategoryLevel` (linje 349+), `IndicatorCategoryRelationship` (linje 853+)

**Lærings-pointer for klimastatus.dk:** Bekræfter vores "kriterier som rygrad via mapping-tabel"-beslutning. Kausals generiske version er for kompleks til vores brug — vi kan hardkode de 16 CCTF-kriterier som en `pgEnum` i Drizzle og spare meget kompleksitet.

---

### 3. `GenericForeignKey` / polymorfe relationer — kobl hvad som helst til hvad som helst

Kausals `Attribute` base-klasse bruger Djangos `ContentType` + `GenericForeignKey` til at hænge attributter på Action, Category, Indicator m.fl. fra én fælles tabel. Det er deres version af vores `cctf_kriterie_mapping`-tabel.

Relevant kode:
- [`actions/models/attributes.py` linje 280-310](https://github.com/kausaltech/kausal-watch/blob/main/actions/models/attributes.py#L280) — `Attribute` base med `content_type` + `object_id` + `GenericForeignKey`

**Lærings-pointer for klimastatus.dk:** Vores `cctf_kriterie_mapping`-tabel med `entitet_type` + `entitet_id` + `kriterie_nr` er den rette Drizzle-oversættelse. Kausal bekræfter mønsteret fungerer i produktion.

---

### 4. `identifier`-slugs på alle entiteter

Kausal bruger stabile string-identifiers (`AutoSlugField`) på alle centrale entiteter — ikke kun UUID'er. Det giver læsbare URL'er og stabile referencer på tværs af data-imports.

Relevant kode:
- [`actions/models/category.py` linje 67](https://github.com/kausaltech/kausal-watch/blob/main/actions/models/category.py#L67) — `identifier = IdentifierField()`

**Lærings-pointer for klimastatus.dk:** Brug stabile identifiers på tiltag, indsatsområder og kriterier. F.eks. `kriterie_01` … `kriterie_16`. Nyttigt når data importeres fra CSV eller eksporteres til SECAP.

---

### 5. Monitoring quality og dækningsgrad

Kausal har en `monitoring_quality`-mekanisme der vurderer kvaliteten af en handlingsplans dokumentation.

Relevant kode:
- [`actions/monitoring_quality.py`](https://github.com/kausaltech/kausal-watch/blob/main/actions/monitoring_quality.py)

**Lærings-pointer for klimastatus.dk:** Dette svarer direkte til vores "dækningsgrad-logik pr. kriterie" (komplet / delvis / manglende). Værd at læse inden implementeringen.

---

## Hvad vi bevidst ikke adopterer fra Kausal

| Kausals valg | Vores begrundelse |
|---|---|
| Fuldt EAV-system med runtime-definerede felter | Overkill — vi har én fast CCTF-ramme med kendte felter |
| Django/Python backend | Vi kører Next.js monolit med Drizzle. Simplere for solo-builder |
| GraphQL API | Server Actions og REST er rigeligt ved vores skala |
| Kubernetes / Helm Charts | Vi kører Docker Compose på Hetzner VPS |
| Wagtail CMS-integration | Ikke relevant — vi har ingen CMS-behov i MVP |
| Multi-sprog (EN/DE/PT) | MVP er dansk-only |

## NZC Data Studio — separat pointe

`nzc-data-studio` er Kausals produkt til EU's Net Zero Cities-initiativ. Next.js + Material UI + next-auth. Dataflow: kommuner/byer indberetter data til en central GraphQL-backend.

Mest interessant for klimastatus.dk som **arkitekturinspiration til tovholder-flowet**: hvordan strukturerer man datainput fra mange forskellige bidragydere til én struktureret rapport?

Link: https://github.com/kausaltech/nzc-data-studio
