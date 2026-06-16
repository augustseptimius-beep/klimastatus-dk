# CCTF-evidensgrundlag — kildedokumentation til den datadrevne platform

**Dato oprettet:** 2026-06-16
**Status:** Levende dokument (opdateres løbende). Dette er *kildelaget* under udviklingsplanen.
**Hører til:** `docs/superpowers/specs/2026-06-15-datadrevet-cctf-platform-design.md` (de 7 faser + 5 bærende principper).
**Beslutningsanker:** `AGENTS.md` — selvevaluering udfaset, CCTF bevaret som rapporteringsrygrad.

---

## 0. Formål og brug

Dette er **evidensgrundlaget** bag udviklingsplanen: hver påstand, hvert tal og hver regel, som de 7 faser og 5 principper bygger på, kobles her til en **præcis kildehenvisning** (dokument + sidetal + ordret citat, hvor muligt). Tre formål:

1. **Tydelighed** — enhver i projektet (og en fremtidig session) kan se *hvorfor* en beslutning er truffet uden at læse 100+ siders PDF.
2. **Kildehenvisning** — planen og fremtidige implementeringsplaner refererer hertil med citatnøgle (fx `[D2 s.31]`).
3. **Verificerbarhed** — load-bearing tal er efterprøvet mod kildeteksten, ikke gengivet fra hukommelsen.

**Citatnøgle videre:** brug `[Dx s.n]`. Eksempel i et plandokument: *"Tiltagskataloget seedes fra de 46 navngivne tiltag `[D2 s.28–37]`."*

**Statusmærker:** `BEKRÆFTER` · `SKÆRPER` (tilføjer præcision/krav) · `MODSIGER` (uenig med planen) · `NYT` (ikke i planen).

**Dokumentets opbygning:**
- **Del I — Rammeværket (kravene):** lineage, komponenter, 16 kriterier, skabeloner/bilag, hårde regler. `[D1] [D3] [D4]`
- **Del II — Det empiriske indhold:** kommunetyper, tiltagskatalog, indikatorer, sektortal. `[D2]`
- **Del III — Det nationale lag:** Klimaalliancens monitoreringssystem, statusrapport, C40-rod. `[D1] [W]`
- **Del IV — Syntese:** 5 principper, 7 faser, nye indsigter, korrektioner til planen, åbne punkter.

---

## 1. Kilderegister

| Nøgle | Dokument | Udgiver / version | Rolle | På disk |
|---|---|---|---|---|
| **[D1]** | *Vejledning til revision og certificering af klimahandlingsplaner* | CONCITO/C40 — national CCTF-guide, v1.0, 07.11.2024 (76 s.) | **Kravene**: skabeloner, bilag, regler, MERL | `vejledning-til-klimaplanrevision_v10.pdf` |
| **[D2]** | *Analyse af kommunernes CO₂-reduktionsbidrag til 70%-målet i 2030* | Ea Energianalyse + CONCITO — DK2020, marts 2024 (41 s., 96 kommuner) | **Indholdet**: tiltag, indikatorer, kommunetyper, sektortal | `(upload)` |
| **[D3]** | *Selvvurderingsskema til scoping-fasen* | Klimaalliancen, v2.5, 25.11.2024 (10 s.) | **Rammeværket**: 16 kriterier ordret + skabelon-mapping | `selvvurderingsskema-25.pdf` |
| **[D4]** | *Opdatering og certificering af klimahandlingsplaner i Klimaalliancen* | Klimaalliancen, 2024 (2 s.) | **Processen**: rytme, scoping/certificering, CAPF→CCTF | `revision-og-certificering-i-ka.pdf` |
| **[W]** | C40 Knowledge Hub, KL, CONCITO, Realdania, NIRAS, regioner.dk (websøgning) | — | **Rod-laget** + nationalt monitoreringslag | *web (kun søgning, ikke fuldtekst)* |

> **Note om [W]:** Den originale C40-vejledning kunne ikke hentes (host uden for miljøets net-allowlist; fuld web-hentning blokeret, kun websøgning virker). [W]-fund er rekonstrueret fra søge-snippets/-opsummeringer og **markeret med sikkerhedsniveau** (HØJ/MIDDEL/LAV). De danske kilder [D1]–[D4] *er* den officielle nationale tilpasning af C40's rammeværk og står på egne ben. Engelsk CCTF-primærdokument findes på `regioner.dk` (se §13) til senere ord-for-ord-verifikation.

---

# DEL I — RAMMEVÆRKET (kravene)

## 2. Lineage og rytme

### 2.1 CAPF → CCTF (hvorfor selvevalueringen kunne udgå uden at røre rygraden)
- CCTF er C40's standard og en **opdatering af Climate Action Planning Framework (CAPF)**, som blev brugt i DK2020. `[D4 s.1]` — *"Standarden er en opdatering af Climate Action Planning Framework, som blev anvendt i DK2020."*
- I CCTF er CAPF's **3 søjler og 30 elementer erstattet af 6 komponenter og 16 kriterier**. `[D3 s.1]`
- De 16 kriterier (ikke selvevaluerings-*dokumentet*) er rygraden kommunen rapporterer ud fra. **Status: BEKRÆFTER** `AGENTS.md`.

### 2.2 Certificerings- og revisionsrytmen
- Opdatering hvert **4.–5. år** efter senest vedtagne plan `[D4 s.1]`; grundig evaluering/revision **minimum hvert 5. år** `[D1 s.4, s.38]`.
- To nedslag: **scoping** (selvvurderingsskema udfyldes før scopingmøde med CONCITO) og **certificering** (skema opdateres; C40+CONCITO certificerer, ideelt **før** byrådsvedtagelse) `[D4 s.2]`.
- Timing bør vurderes ift. **kommunalvalg** og budgetkadencer (midtvejs / før-efter valg / parallelt med kommuneplan) `[D1 s.4, s.7]`.
- Tidshorisonter: **kort = 0–5 år** (frem til 2030), **mellem = 5–10 år** (2030–2040), **lang = >10 år** (2040–2050+) `[D1 s.24, fodnote 9]`.
- Klimaalliancen = partnerskab mellem **KL, Realdania, 5 regioner**, løber til **2027**; **CONCITO + C40** videnspartnere `[D4 s.2]`.
- **Status: SKÆRPER** princip 3+4 (rytmen er 4–5 år / min. 5 år — se korrektion §12).

## 3. De 6 komponenter og 16 kriterier

### 3.1 De 6 komponenter (definitioner) `[D1 s.5]`
1. **Forpligtelse, styring og mainstreaming** (rød) — politisk forpligtelse, styring, integration af planen (K1–2)
2. **Inkluderende inddragelse og kommunikation** (lilla) — inddragelse, kommunikation, partnerskaber (K3–4)
3. **Viden som grundlag** (grøn) — vidensgrundlaget for planlægningen (K5–7)
4. **Mål for hele kommunen** (gul) — mål og sektorstrategier (K8–11)
5. **Handlinger og implementeringsplanlægning** (blå) — klimatiltag (K12–14)
6. **Monitorering, evaluering og rapportering** (grå) — MERL (K15–16)

**3 tværgående aspekter** gennemsyrer alle kriterier: klimatilpasning, drivhusgasreduktion, retfærdighed `[D1 s.5]`. **3 tværgående elementer skærpet ift. CAPF:** (1) tilgængelige beføjelser/indflydelse, (2) forbrugsudledninger, (3) rimelig/retfærdig fordeling `[D1 s.6]`.

### 3.2 De 16 kriterier — ordret, med skabelon/bilag- og platform-mapping
Kriterieteksten er gengivet ordret fra `[D3]`. "Skabelon/bilag" = CCTF-værktøjet kriteriet dokumenteres med. "Platform" = hvor det lever i `klimastatus-dk-datamodel.md`.

**K1** `[D3 s.2]` — *"Offentlig forpligtelse fra siddende borgmester (eller kommunalbestyrelse) til at igangsætte hurtig, rimelig og retfærdig handling … for at opnå netto-nuludledning og styrke klimarobustheden i overensstemmelse med Parisaftalens højeste ambition (1.5 ̊C)."* → Skabelon **1.1** · `Kommune.klimakommitment_*`

**K2** `[D3 s.2]` — *"Klimaforpligtelser og -hensyn er integreret i interne styrings- og beslutningsstrukturer …"* (mainstreaming) → cross-cutting

**K3** `[D3 s.3]` — *"Inddragelse af forskellige interessenter … Interessenterne bør omfatte dem, der påvirkes mest … samt dem, der har magt, indflydelse og potentiale til at reducere emissioner og klimarisici."* → Skabelon **2.1** (+ **4.1**) · `Aktør`

**K4** `[D3 s.3]` — *"Der etableres samarbejder og partnerskaber med eksterne interessenter, herunder andre politiske niveauer, finansielle institutioner, erhvervs- og lokalsamfundsorganisationer og offentligheden …"* → Skabelon **2.1** (+ **1.1**) · `Aktør`

**K5** `[D3 s.4]` — *"Vidensopbygning til at understøtte identifikationen af klimatilpasningsstrategier og -tiltag …"* → "Guides til risikovurdering" + skabelon **1.1** · `Klimafare`, `Konsekvensvurdering`

**K6** `[D3 s.4]` — *"Vidensopbygning til at understøtte identifikationen af strategier og tiltag til reduktion af drivhusgasudledning indenfor og udenfor kommunegrænsen …"* → Skabelon **1.1** + **bilag 3** · `Drivhusgasregnskab_post`

**K7** `[D3 s.4–5]` — *"Dokumentation af at sektorspecifikke og socioøkonomiske data med fokus på rimelighed og retfærdighed er taget med i betragtning …"* → Skema 1+2 i skabelon **4.1** · `Sårbar_gruppe`

**K8** `[D3 s.6]` — *"Kort-, mellem- og langsigtede klimatilpasningsmål for hele kommunen …"* → workshopskabelon i "Guides til risikovurdering" · `Mål` (tilpasning)

**K9** `[D3 s.6]` — *"Kort-, mellem- og langsigtede netto-nul reduktionsmål for hele kommunen …"* → **bilag 3** · `Mål` (reduktion)

**K10** `[D3 s.7]` — *"Mål … der skal sikre, at klimatiltag bidrager til at fremme social, miljømæssig og økonomisk rimelighed, retfærdighed og lighed."* → skema 3 i skabelon **4.1** + **bilag 4** · `Mål` (equity)

**K11** `[D3 s.7]` — *"Sektorspecifikke strategier, der tilsammen opfylder kommunens mål for klimatilpasning, netto-nuludledning samt rimelighed og retfærdighed."* → **bilag 3** · `Indsatsområde`

**K12** `[D3 s.8]` — *"Tilpasnings- og reduktionsstiltag … som minimum omfatte: ● Handlingens titel og beskrivelse ● Vejledende tidsplan ● Handlingsejere ● Forventet effekt og fordele."* → skabelon **1.1** + **3.1** + risikovurdering · `Tiltag`

**K13** `[D3 s.8–9]` — *"Kommunen skal bruge alle tilgængelige beføjelser til at stoppe brugen af … fossile brændstoffer … at alle kulfyrede kraftværker er udfaset inden 2030. Kommunen bør bruge alle tilgængelige beføjelser, såsom tilladelser, dialog, kommunal drift og indkøb, kommunale investeringer, pensionsfonde, fysiske og finansielle aktiver."* → **dedikeret kolonne i skabelon 1.1** + **bilag 1** · `Tiltag.udfaser_fossile_brændsler`

**K14** `[D3 s.9]` — *"Implementeringsplanlægning for prioriterede handlinger … ● Understøttende tiltag ● Implementeringsplan, tidsramme og milepæle ● Berørte interessenter ● Detaljerede omkostninger ● Finansiering og finansieringsmetode ● Fordeling af merværdier ● Indikatorer."* → `Tiltag` (`prioriteret_tiltag` + udvidede felter)

**K15** `[D3 s.10]` — *"Et system til monitorering, evaluering, rapportering og læring af erfaringer (MERL) … et sæt indikatorer til at vurdere implementering af tiltag og fremskridt på output-, outcome- og impactniveau."* → skabelon **5.1** + **bilag 5** · `Indikator`, `Monitoreringscyklus`, `Læringspost`

**K16** `[D3 s.10]` — *"Løbende offentlig kommunikation og rapportering af status for implementering af klimaplanen og fremdrift mod klimamålene."* → offentligt dashboard / `Monitoreringscyklus`

> **CAPF→CCTF-mapping findes i [D1 s.48–49]** (alle 16 kriterier mappet til CAPF-elementer). **K11 og K13 er helt nye kriterier uden CAPF-ækvivalent** `[D1 s.49]` — direkte input til `cctf_kriterie_mapping` og `getCctfDaekning`. **Status: NYT.**

## 4. CCTF-skabeloner & bilag — feltindhold `[D1]`
Dette er "kravene" omsat til konkret struktur. Hver skabelon er reelt en datamodel.

### 4.1 Skabelon 1.1 — beføjelser/roller (bilag 1) `[D1 s.50–52]`
- **To akser:** kommunens **roller** × **indsatsområder**. Reduktion: sektorer + fossil-udfasning (forbrug i bilag 3). Tilpasning: klimafarer + koblede hændelser. Nederste række = konklusion på dækningsgrad + barrierer.
- **De 4 kommunale roller (ordret `[D1 s.51]`):**
  - **Virksomhed** — *"Kommunen som driftsorganisation, herunder kommunens egne bygninger, køretøjer, indkøb og institutioner."*
  - **Leverandør (selskabsejer)** — *"Kommunen forsyner borgerne … som ejer af forsyningsselskaber og ved udbud af fx affaldsindsamling og kollektiv transport."*
  - **Myndighed** — *"På en række områder er kommunen planlægnings- og godkendelsesmyndighed"* (fysisk planlægning, miljø, varmeplan, tilsyn).
  - **Facilitator** — *"væsentligt bredere og mindre skarpt defineret"*; **3 underroller**: (i) advokere/dialog (især nationalt), (ii) partnerskaber/puljer/programmer, (iii) lokal meningsdanner. `[D1 s.51 fodnote 16, s.64]`
- **K13 fossil-kolonne:** *"den eneste kolonne, hvor alle fire roller og dertilhørende beføjelser skal udnyttes, og det ellers skal begrundes hvorfor"* `[D1 s.52]`. For K6/K12: ikke alle roller pr. sektor, men *"alle roller … i spil på tværs af sektorerne"*.
- **Status: BEKRÆFTER** (4 roller) **+ SKÆRPER** (facilitator = 3 underroller; fossil-kolonne = alle 4 obligatorisk). Platform: `Tiltag.beføjelseskategori` bør rumme de 3 facilitator-underroller, og dækningsmotoren (Fase 4) bør håndhæve fossil-kolonne-reglen.

### 4.2 Skabelon 5.1 + bilag 5 — MERL/indikatorer `[D1 s.40, s.75–76]`
- **Output/outcome/impact** (logisk kæde input→action→output→outcome→impact), defineret `[D1 s.40]`: *"Output: de umiddelbare resultater og leverancer. Her opsatte MW solceller. Outcome: De direkte forandringer … Her MWh elproduktion. Impact: De afledte og langsigtede effekter. Her den drivhusgasreduktion …"* → **NB: defineret under K15-tekstboks (s.40), ikke i bilag 5** (se korrektion §12).
- **Skabelon 5.1** = matrix med separate tabeller for reduktion og tilpasning, 3 rækker: **sektormål → indsatser → indikatorer** pr. sektor/klimafare `[D1 s.75]`. (Equity-indikatorer hører til skabelon 4.1.)
- **Indikatortypologi (4 dikotomier)** `[D1 s.75–76]`: direkte/indirekte · aggregeret/operationel · kvantitativ/kvalitativ · **bottom-up/top-down**.
- **Bottom-up vs. top-down (ordret)** `[D1 s.76]`: *"I en monitoreringssammenhæng er top-down data svære at anvende, da de i mindre grad informerer om udviklingen lokalt."*
- **5 kvalitetskriterier** `[D1 s.76, Tabel 11]`: **Repræsentation, Komplethed, Pålidelighed, Målbarhed, Økonomisk** (alle ordret). Plus CREAM (Clear, Relevant, Economic, Accepted, Monitorable) `[D1 fodnote 24]`.
- **Status: BEKRÆFTER** princip 1+2; **SKÆRPER** Fase 2 (de 4 dikotomier + 5 kvalitetskriterier er direkte indikator-metadatafelter).

### 4.3 Skabelon 2.1 + bilag 2 — interessenter `[D1 s.54–55]`
- **Skema 1 (kortlægning):** 3 grupper × 2 kolonner. Grupper: *påvirkes mest af klimaforandringer · påvirkes mest af klimatiltag · har magt og indflydelse til at reducere emissioner og klimarisici.* Kolonner: klimatilpasning / drivhusgasreduktion.
- **Skema 2 (inddragelse):** *interessent | inddragelse | påvirkning af klimahandlingsplan.* Manglende inddragelse skal begrundes.
- **Krydskobling:** gruppe 3 → skabelon 1.1 facilitatorkolonne (K4); gruppe 1+2 → skabelon 4.1 (K7+K10).
- **Status: NYT** (direkte struktur til `Aktør`-entiteten, Fase 7).

### 4.4 Skabelon 3.1 + bilag 3 — forbrug `[D1 s.58, s.64]`
- **Avoid-Shift-Improve-matrix** pr. forbrugskategori: rækker = 4 roller (facilitator=3 underroller), kolonner = **Undgå / Skift / Forbedre**. Facilitatorrollen **skal** aktiveres pr. udvalgt forbrugsområde.
- **Dominerende kategorier ("bilen, bøffen, boligen"):** *"for alle kommuner … fødevarer, transport, og bolig/byggeri"* `[D1 s.58]`.
- **Negativ regel:** *"det ikke er et krav, at kommunen udarbejder et forbrugsbaseret CO2-regnskab"* `[D1 s.56]` og **ikke** krav om overordnet reduktionsmål for forbrug `[D1 s.58]` — derimod krav om **vision + sektorstrategier (SMART) + indikatorer** for min. 2 kategorier.
- **Status: BEKRÆFTER** (min. 2 forbrugskategorier) **+ NYT** (forbrug ≠ regnskab/mål; Fase 7 + validering).

### 4.5 Skabelon 4.1 + bilag 4 — equity `[D1 s.68–73]`
- **3 skemaer:** skema 1+2 = vidensgrundlag (K7) for hhv. **udledningssektorer** og **klimafarer** (byrder + merværdier, skæv fordeling på udsatte grupper); skema 3 = **mål/fokusområder (K10)** + tiltag→mål-kobling + **indikatorer (K15/16)**.
- **C40-sårbarhedskategorier** `[D1 s.69 fodnote 23]`: lavindkomst, race/etnicitet, religiøse minoriteter, funktionsvariationer, psykisk sårbare, køn, ældre, børn/unge, udendørs-arbejdere m.fl. **3 fordelingstemaer: Adgang · økonomisk velstand · placering (geografi).**
- **Status: NYT** (struktur til `Sårbar_gruppe` + equity-mål, Fase 7).

## 5. Hårde regler & tærskler (valideringsgrundlag for Fase 3) `[D1]`

| Regel | Tærskel | Kilde | Status vs. plan |
|---|---|---|---|
| Drivhusgasregnskab — alder | **≤ 3 år** (rapporteres min. hvert 2.–3. år) | `[D1 s.19]` | BEKRÆFTER |
| Klimarisikovurdering — alder | **≤ 5 år**, byg på **data ≤ 10 år** | `[D1 s.17–18]` | BEKRÆFTER |
| Netto-nul | senest **2050**; første mål senest **2030**; min. **2 delmål**; min. CO₂, CH₄, N₂O | `[D1 s.25–26]` | BEKRÆFTER (+ NYT: CO₂/CH₄/N₂O) |
| Forbrugskategorier | min. **2** (DK anbefales flere) | `[D1 s.19, s.31]` | BEKRÆFTER |
| Fossil/kulkraft | **alle kulfyrede kraftværker udfaset inden 2030**; ingen ny fossil forsyning (inkl. naturgas/LNG) | `[D1 s.34]` | BEKRÆFTER |
| Reduktioner ↔ tiltag | alle reduktioner koblet til et tiltag (som **kvalitetssikrings-støttespørgsmål**) | `[D1 s.20, s.27]` | BEKRÆFTER (nuance) |
| Fremtidsscenarier | frem til **mindst 2050** | `[D1 s.15, s.17]` | NYT |

**Sektor-reduktionsintervaller med afvisningsregel `[D1 s.28]` (NYT — stærk kvantitativ validering):**

| Sektor | Lav | Midt | Høj |
|---|---|---|---|
| Energi | 89% | 102% | 115% |
| Transport | 30% | 33% | 36% |
| Industri | 40% | 50% | 60% |
| Landbrug | 21% | 30% | 38% |
| Andet | 69% | 71% | 72% |

*(reduktion i 2030 vs. 2019, fra regeringens klimaprogram 2022).* Regel: *"Ethvert mål under det beregnede udfaldsrum er utilstrækkeligt og kan ikke godkendes."* `[D1 s.28]`. Mål i lav ende skal begrundes; øvre halvdel accepteres uden forbehold.

**Yderligere valideringsregler `[D1]`:**
- Reduktionstiltag **må ikke** omfatte CCS der legitimerer fossil energiforsyning, eller ny affaldsforbrændingskapacitet `[D1 s.33]`. **NYT.**
- Netto-nul-mål **senere end nationalt** (2050/2045) *"sjældent tilstrækkeligt ambitiøst"* `[D1 s.26]`. **NYT.**
- **K12 minimumsfelter** (alle tiltag): titel/beskrivelse, tidsramme, handlingsansvarlig, forventede effekter/merværdier `[D1 s.33]`. **BEKRÆFTER.**
- **K14 udvidede felter** (prioriterede kortsigtede tiltag): omkostninger + finansiering + finansieringstilgang, MERL-plan m. indikatorer, kommunikationsplan, barrierer, interessenter; detaljeret cost-benefit **ikke** påkrævet `[D1 s.36]`. **BEKRÆFTER.**
- **K11 sektorstrategi** (3 elementer): overblik over omstilling, sektorspecifikke **SMART-mål**, indikatorer `[D1 s.30]`. **NYT.**

---

# DEL II — DET EMPIRISKE INDHOLD (CO₂-analysen) `[D2]`

> Verificeret mod kildeteksten. Analysen dækker **96 ud af 98 kommuner** (Dragør og Glostrup undtaget) og **99% af DK's befolkning og areal** `[D2 s.6]`.

## 6. Empiriske kataloger og benchmarks

### 6.1 Kommunetyper (Danmarks Statistik) `[D2 s.31]`
- 5 typer bekræftet: land, oplands, provinsby, storby, hovedstad. **Status: BEKRÆFTER** (Fase 1).
- **Fuld kommune→type-mapping (seed-klar) — `[D2 s.31, Figur 10]`:**

| Type | Antal | Kommuner |
|---|---|---|
| **Land** | 31 | Odsherred, Kalundborg, Lolland, Guldborgsund, Vordingborg, Bornholm, Svendborg, Langeland, Ærø, Haderslev, Billund, Sønderborg, Tønder, Fanø, Varde, Aabenraa, Lemvig, Struer, Norddjurs, Samsø, Ringkøbing-Skjern, Morsø, Skive, Thisted, Brønderslev, Frederikshavn, Vesthimmerlands, Læsø, Mariagerfjord, Jammerbugt, Hjørring |
| **Oplands** | 24 | Fredensborg, Frederikssund, Halsnæs, Gribskov, Holbæk, Faxe, Ringsted, Stevns, Sorø, Lejre, Middelfart, Assens, Faaborg-Midtfyn, Kerteminde, Nyborg, Nordfyns, Vejen, Syddjurs, Favrskov, Odder, Skanderborg, Ikast-Brande, Hedensted, Rebild |
| **Provinsby** | 16 | Helsingør, Hillerød, Køge, Roskilde, Slagelse, Næstved, Esbjerg, Fredericia, Horsens, Kolding, Vejle, Herning, Holstebro, Randers, Silkeborg, Viborg |
| **Storby** | 3 | Odense, Aarhus, Aalborg |
| **Hovedstad** | 25 (23 omfattet) | København, Frederiksberg, Ballerup, Brøndby, Dragør\*, Gentofte, Gladsaxe, Glostrup\*, Herlev, Albertslund, Hvidovre, Høje-Taastrup, Lyngby-Taarbæk, Rødovre, Ishøj, Tårnby, Vallensbæk, Furesø, Allerød, Hørsholm, Rudersdal, Egedal, Greve, Solrød |

\* ikke omfattet af rapporten. **Status: NYT** (kan seedes 100%).

### 6.2 Gennemsnitligt reduktionsmål pr. type `[D2 s.17, Tabel 6]`
storby **90%** · hovedstad **80%** · provinsby **76%** · land **71%** · oplands **70%** (simpelt gennemsnit, 1990→2030). Alle 5 planclaims **BEKRÆFTET** eksakt (Fase 5). Pointe: spændet afspejler **sektorprofil**, ikke ambition.

### 6.3 Tiltagskatalog — 46 navngivne tiltag med udbredelses-% (seed-klar)
> Planen antog ~31; kilden giver **46**. Industri/"øvrige" har ingen tiltagstabel `[D2 s.30]`.

- **Energi `[D2 s.28]`:** olie-/naturgasfyr→fjernvarme/varmepumpe **99%** · varmebesparelser 86% · solceller marker 78% · solceller tage 67% · landvind 66% · biogasanlæg 48% · fossil ud af fjernvarme 46% · overskudsvarme 42% · plastudsortering 39% · **CCS 32%** · PtX 29%.
- **Transport `[D2 s.29]`:** el/gas kollektiv 85% · **ladeinfrastruktur 85%** · cyklisme 77% · kommunal elflåde 73% · elektrificering person-/varebiler 73% · fremme kollektiv 59% · transportvaner 57% · samkørsel/delebiler 56% · tunge køretøjer fossilfri 54% · energieffektivitet 36%.
- **Landbrug/areal `[D2 s.30]`:** **skovrejsning 78%** · **lavbundsjorde 70%** · landbrugs-klimaplan 43% · forgasning husdyrgødning 40% · biochar 30% · staldteknologi 29% · natur-/klimagenopretning 25% · fodringsteknologi 24% · afgrødeomlægning 23% · planteavl i øvrigt 22%.
- **Scope 3 `[D2 s.37]`:** grønne indkøb 66% · affaldssortering 54% · klimavenlig kost 53% · bæredygtige byggematerialer 46% · mindre madspild 45% · bæredygtig levevis 42% · genanvendelse byggematerialer 35% · cirkulær økonomi 33% · kommunen som virksomhed 31% · CO₂-regnskaber for virksomheder 29% · tekstilgenbrug 18% · deleøkonomi 12% · renovering>nybyggeri 7% · elektronik 6% · int. flyrejser 5%.

**Status: BEKRÆFTER** (alle 5 claims: 99/78/85/70/32%) **+ NYT** (komplet 46-tiltags katalog — Fase 1).

### 6.4 De 9 omstillingsindikatorer + nationale målværdier `[D2 s.35, Tabel 13]`

| Indikator | Enhed | Kommuner 2030 | National målværdi |
|---|---|---|---|
| Udfasning af naturgas til rumvarme | % | 94% | **100% i 2035** |
| Indfasning af elbiler | % af bilpark | 31% (inkl. plug-in) | **23% rene (2030)** |
| Elproduktion fra solceller | GWh/år | 22.200 | **~27.000** |
| Elproduktion fra land-/kystvind | GWh/år | 15.800 (19.500 m. kyst) | **~23.000** |
| Udtag af lavbundsjorde | ha | 64.300 | **80.000** |
| Skovrejsning | ha | 51.600 | **~60.000** |
| Biogas | GWh/år | 12.600 | **14.500** |
| PtX | GWh/år | 9.200 | **17.500** |
| CCS | kt CO₂/år | 2.100 | **3.200** |

Præcis **9** indikatorer. Alle 9 målværdier + enheder **BEKRÆFTET** (Fase 1/2/5).

### 6.5 Sektorfordeling af restudledning 2030 `[D2 s.40, Tabel 16]`
Landbrug+areal **55%** · transport **43%** · industri 6% · øvrige 3% · energi −8%. **Landbrug+areal + transport = 98%** `[D2 s.40]`. Disse er de sværeste sektorer (landbrug −32%, transport −25% ift. basisår), hvor de stærkeste håndtag ligger nationalt/EU og kommunen mest er **facilitator/myndighed**. **Status: BEKRÆFTER + NYT** (Fase 4+7's hast).

### 6.6 Top-down vs. bottom-up — dataudfordringer `[D2]`
- Nationale rammer (sol/vind, CCS, PtX) blev fastlagt **efter** kommunernes planer — derfor "halter" indikatorerne `[D2 s.34]`.
- Ingen entydig top-down→lokal oversættelse af 70%-målet `[D2 s.17]`.
- Aggregerede regnskaber afviger på sektorniveau `[D2 s.15, s.39]`; metodefrihed gør sammenligning svær `[D2 s.16]`.
- **Status: BEKRÆFTER** princip 2 (Fase 2). *Kilden bruger ikke ordet "top-down nedskaleret" — men [D1 s.76] gør pointen ordret.*

### 6.7 Scenarie- og benchmarkdata (seed til scenarie-/manko-funktion) `[D2]`
1990 = 78,6 mio. t · basisår = 49,5 · 2030-mål = 18,8. Tiltagsscenarie 2030 = 21,4 (**73%** ift. 1990) → **manko 2,6 mio. t / 3 %-point** til kommunernes egne mål `[D2 s.9, s.23]`. Basisår varierer 2017–2020 `[D2 s.15]` (normalisering). Globale benchmarks: IPCC AR6 1,5°C = 43% (2030 vs. 2019); FN ikke-statslige = 50% `[D2 s.19]`. **Status: NYT** (Fase 5).

---

# DEL III — DET NATIONALE LAG

## 7. Klimaalliancens fælles monitoreringssystem (kernen i princip 5)

- **Bekræftet i [D1]:** *"Som en del af Klimaalliancen etableres der et fælles monitoreringssystem, som kommunerne rapporterer til årligt."* `[D1 s.40]`. Systemet: (1) har kortlagt interventionslogikker (output-outcome-impact), (2) identificeret tilgængelige outcome/impact-indikatorer (inkl. equity + forbrug), (3) etableret rapportering hvor kommuner **årligt indrapporterer på handlingsniveau + oplevede klimahændelser** `[D1 s.40–41]`.
- **Systemet leverer data til kommunerne:** *"kommunerne få stillet en række data til rådighed … fra centrale registre, fx på energiforbrug, bygningsstørrelser, transportforbrug, antal af private biler"* `[D1 s.65]`.
- **Bekræftet i [W]:** systemet ejes af CONCITO under Klimaalliancen, bygger på survey **"Kommunernes Årlige Klimastatus"** (besvaret af 96 kommuner) + kommune-specifikke registerdata; omtalt maj 2025 som **nationalt klimaværktøj** ("første gang i verden"). Sikkerhed: **HØJ** for eksistens/ejerskab; **LAV** for "fjerner dobbeltrapportering" (rimelig, men uverificeret slutning).
  Kilder: realdania.dk/nyheder/2025/05/…, ens.dk/presse/…, concito.dk/om-status-paa-kommunernes-klimahandling.
- **Konsekvens for platformen:** princip 5 har et **konkret integrationsmål**. Platformens datahub (Fase 2) og rapportering (Fase 6) bør **spejle og fodre** dette system (samme indikatordefinitioner, årlig kadence), ikke bygge et parallelt. **Status: BEKRÆFTER (stærkt) + NYT.**

## 8. Statusrapport april 2025 — ~80 anbefalinger til realisering `[W]`
- KL/CONCITO *"Status på kommunernes klimahandling"* (30. apr. 2025): **~80 anbefalinger** til kommunerne og Klimaalliancen om hvor handling/tempo skal styrkes. Faktagrundlag: kommunerne har samlet **>6.500 tiltag**; ~**1.200 CO₂-tiltag** (halvdelen gennemført) og ~**270 klimatilpasningstiltag**; udledninger faldt **~20%** (47→38 mio. t CO₂e, 2018–2022).
- Sikkerhed: **HØJ** for rapportens eksistens/dato/nøgletal; **LAV** for de 80 anbefalingers ordlyd (ikke set i snippets — kræver PDF-hentning, se §13).
- **Relevans:** Direkte belæg for "anbefalinger til realisering" (KL-linket) og for rapporterings-søjlen (Fase 6). **Status: NYT.**

## 9. C40/CAPF — rod-laget `[W]` (til verifikation mod original, §13)
- **CAPF** udviklet af C40 2017–18 med 8 byer; **5 essential components**: emissions neutrality · building resilience · inclusivity & benefits · governance & mainstreaming · monitoring progress. Mål: halvér emissioner inden 2030, netto-nul 2050, 1,5°C. Sikkerhed: **HØJ**.
- **"3 søjler / 30 elementer"** bekræftet af danske sekundærkilder (NIRAS, KL), men **ikke** set opremset i C40-primærkilde; terminologi svinger "elementer/kriterier". Sikkerhed: **MIDDEL**.
- **CAPF→CCTF (dec. 2023):** drevet af *"Integrity Matters for Cities, States and Regions"*; skærpet fokus på **forbrug, fossil-udfasning, climate budgeting & mainstreaming, kvantitative tilpasningsmål, MERL**. *"3 søjler/30 → 6 komponenter/16 kriterier."* Sikkerhed: **HØJ**.
- **DK2020/Klimaalliancen:** ~alle 98 kommuner (95/96/97 afhængigt af opgørelsesår; København separat via eget C40-medlemskab) — *"første gang i verden"*. Sikkerhed: HØJ for "tæt på alle 98"; MIDDEL for eksakt tal.

---

# DEL IV — SYNTESE

## 10. De 5 bærende principper — evidens

1. **CCTF = sammenhæng, ikke checkliste.** Skabelon 5.1: kæden **sektormål → indsatser → indikatorer** pr. sektor/klimafare `[D1 s.75]`; rolle×indsatsområde-matrix i skabelon 1.1 `[D1 s.50]`. **Velunderbygget.**
2. **Nationalt katalog som start, lokal bottom-up til styring.** Top-down *"informerer i mindre grad om udviklingen lokalt"* `[D1 s.76]`; nationale rammer forsinkede `[D2 s.34]`. Katalogerne: §6.3–6.4. **Velunderbygget.**
3. **Årlig rytme + flerårig læring.** Årlig offentlig rapportering (K16) `[D1 s.38, s.41]`; grundig evaluering/revision min. hvert 5. år `[D1 s.4, s.38]`; konfigurerbare milepæle ift. valg/budget `[D1 s.4, s.7]`. **Velunderbygget** (rytme = 4–5 år / min. 5, se §12).
4. **"Altid recertificerings-klar".** Friskhedstærskler: regnskab ≤3 år `[D1 s.19]`, risikovurdering ≤5 år/data ≤10 år `[D1 s.17]`, scenarier til 2050 `[D1 s.15]`. **Velunderbygget.**
5. **Spejl Klimaalliancens fælles monitoreringssystem.** Eksisterer og kommunen indrapporterer årligt `[D1 s.40–41]`; nationalt værktøj bekræftet `[W]`. **Velunderbygget + konkret integrationsmål (§7).**

## 11. De 7 faser — evidens & nye indsigter

| Fase | Evidens | Vigtigste nye fund |
|---|---|---|
| **1** Nationale kataloger + kommunetype | **Fuldt dækket** `[D2 s.17,28–37,31]` | Katalog = **46** tiltag (ikke ~31); fuld kommune→type-mapping; 9 indikatorer m. målværdi |
| **2** Datahub (top-down/bottom-up, metadata) | `[D1 s.75–76] [D2 s.34]` | **4 indikator-dikotomier + 5 kvalitetskriterier** som konkrete metadatafelter; nationalt system leverer registerdata `[D1 s.65]` |
| **3** Hårde regler & friskhed | `[D1 s.17–34]` | **Sektor-reduktionsintervaller m. afvisningsregel** `[D1 s.28]`; fossil-kolonne = alle 4 roller; CCS/affald-forbud; CO₂/CH₄/N₂O |
| **4** Sammenhængs-motor | `[D1 s.50–52,75]` | Skabelon 1.1 + 5.1 *er* dækningsmotoren; rolle×sektor-matrix m. obligatorisk fossil-kolonne `[D1 s.52]`; rolle×sektor-hast `[D2 s.40]` |
| **5** Benchmarking | **Fuldt dækket** `[D2 s.17,31,35,40]` | Sektorkorrektion; normalisering for **basisår 2017–2020** `[D2 s.15]`; manko-data `[D2 s.9]` |
| **6** Rapportering & transparens | `[D3 s.10] [D1 s.38,41] [W]` | Spejl survey *"Kommunernes Årlige Klimastatus"*; ~80 anbefalinger som rapport-input `[W]` |
| **7** Tilpasning/interessenter/equity | `[D1 s.17,24,54,68]` | **Goals (kvalitativ) vs. targets (SMART)** for tilpasning `[D1 s.24]`; skabelon 2.1/4.1-strukturer; 3 fordelingstemaer (adgang/økonomi/placering) |

## 12. Verifikation af plan-tekst (præciseringer)

Ved efterprøvning mod kilderne **holder design-doc'ens kildehenvisninger** — princip 2's bottom-up/top-down og Fase 2's 5 kvalitetskriterier *er* bilag 5 `[D1 s.76]`, og princip 1's kæde *mål→tiltag→indikator* *er* skabelon 5.1 `[D1 s.75]`. (Min oprindelige formodning om en fejl-tilskrivning af output/outcome/impact til bilag 5 **holdt ikke** ved verifikation — planen gør det ikke.) Tre mindre præciseringer:

> **Status (foldet ind 2026-06-16):** alle tre er nu indarbejdet i `2026-06-15`-planen — (1) princip 1 + Fase 4 skelner kæden (bilag 5/skabelon 5.1) fra rolle-matricen (bilag 1/skabelon 1.1); (2) princip 3 + kernetesen siger "hvert 4.–5. år (min. hvert 5. år)"; (3) Fase 1 seeder nu **46** tiltag. Beskrivelserne nedenfor citerer den oprindelige plantekst for sporbarhed.

1. **Roller hører til skabelon 1.1, ikke 5.1.** Princip 1 skriver `(Kilde: Bilag 5, skabelon 5.1.)` om både kæden *og* *"alle fire kommunale roller"*. Kæden er skabelon 5.1 ✓, men **rolle-matricen er skabelon 1.1/bilag 1** `[D1 s.50–52]`. Til protokollen: **output/outcome/impact** defineres i **K15-tekstboksen `[D1 s.40]`** (ikke i bilag 5; begge dele hører dog under komponent 6). → *Valgfri mikro-præcisering.*
2. **Revisionsrytmen.** `AGENTS.md` siger selvevalueringen *"genereres ~hvert 4. år"*; design-doc'en taler om "5-årig læring". Kilderne: **[D4] "4.–5. år"**, **[D1] "minimum hvert 5. år"** (aldrig 4), **[W] "4–5 år"**. → *Anbefaling: standardisér til "hvert 4.–5. år (grundig evaluering min. hvert 5. år)".*
3. **"~31 tiltag" → 46.** Design-doc'ens Fase 1 nævner "~31 navngivne standardtiltag"; kilden har **46** `[D2 s.28–37]`. → *Anbefaling: opdatér tallet.*

> Mikro-citat: princip 2 gengiver top-down-pointen som *"informerer i mindre grad om udviklingen lokalt"*; kildens ordstilling er *"…i mindre grad informerer om udviklingen lokalt"* `[D1 s.76]` (identisk betydning).

## 13. Nye indsigter — kandidater til at skærpe planen

- **Sektor-reduktionsintervaller `[D1 s.28]`** kan blive en konkret, kvantitativ validering i Fase 3 (mål under interval → "kan ikke godkendes"), stærkere end den nuværende generiske formulering.
- **Det nationale monitoreringssystem eksisterer allerede `[D1 s.40] [W]`** — Fase 2/6 bør eksplicit spejle survey *"Kommunernes Årlige Klimastatus"* + registerdata, frem for at designe et parallelt indrapporteringslag. Stærkeste enkeltindsigt.
- **Goals vs. targets `[D1 s.24]`** — tilpasningssporet (Fase 7) bør modellere både kvalitative *goals* og kvantitative SMART *targets* som distinkte felter.
- **Forbrug ≠ regnskab/mål `[D1 s.56,58]`** — undgå at over-implementere et forbrugsregnskab; kravet er vision + indikatorer for min. 2 kategorier.
- **De ~80 anbefalinger `[W]`** — værd at hente og mappe mod de 7 faser, når web-fetch åbnes (kan validere/udvide roadmap).
- **K11/K13 er nye kriterier uden CAPF-ækvivalent `[D1 s.49]`** — dækningsmotoren bør behandle dem som "ny-i-CCTF" (kommuner har ikke historik her).

## 14. Åbne punkter — verifikation mod original C40-guide
Hentes når web-fetch/allowlist åbnes (prioriteret af [W]-agenten):
1. **`regioner.dk/media/fe1fkmyh/c40-cities-climate-transition-framework.pdf`** — engelsk CCTF-**primærdokument**: de 6 komponenter + 16 kriterier ord-for-ord (verificér §3, §9).
2. `kl.dk/media/sodlkbwi/sammenfatning_status-…-2025…pdf` — de **~80 anbefalinger** ordret (§8).
3. `concito.dk/files/…/Status…ver1.2.pdf` — monitoreringssystemets opbygning + indikatorer (§7).
4. `c40knowledgehub.org/s/article/Cities-Climate-Transition-Framework` — kanoniske komponentnavne (engelsk).

Åbne spørgsmål: (a) eksakt ordlyd af CAPF's 30 elementer; (b) om det nationale system formelt eliminerer dobbeltrapportering; (c) fordelingen af de 16 kriterier på de 6 komponenter i C40's egen visualisering.

---

*Levende dokument. Sidst redigeret: 2026-06-16 (fuld første udgave — Del I–III verificeret mod [D1]–[D4]; [W] markeret med sikkerhedsniveau; §12 samler uoverensstemmelser fundet ved verifikation).*
