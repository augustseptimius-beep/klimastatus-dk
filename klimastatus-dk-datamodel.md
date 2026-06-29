# klimastatus.dk - datamodel og CCTF-mapping

> **Opdatering 2026-06-15 — Selvevaluering udfaset.** Selvevaluerings-dokumentet (CCTF-recertificering, ~hvert 4. år) er fjernet som feature. CCTF-kriterierne og mapping-tabellen bevares som rygraden i den **løbende rapportering** (dækningsberegning, dashboard, offentlig visning) — kun selve selvevaluerings-entiteten er taget ud af brug (tabellen står dormant). Se `AGENTS.md` for beslutningen. Afsnittet "Selvevaluering" nedenfor er bevaret som historik.

Dette dokument er en arbejdsskitse for datamodellen i klimastatus.dk. Det er ikke et færdigt schema, men en gennemtænkt udgangsstruktur der kan oversættes direkte til kode. Strukturen tager udgangspunkt i CCTF-vejledningen (Klimaalliancen, version 1.0, november 2024) og er bygget så de 16 kriterier udgør datamodellens rygrad, ikke et lag oven på et generisk projektledelsessystem.

## Den arkitektoniske kerneidé

Hvert datapunkt der indtastes eller hentes ind, skal kunne knyttes til ét eller flere CCTF-kriterier. Det er den ene beslutning der gør auto-genereringen af selvevalueringen mulig, og den er svær at lave om bagefter. Alt andet bygger ovenpå den.

Konkret betyder det at vi har en separat mange-til-mange tabel mellem entiteter (tiltag, indikatorer, mål osv.) og de 16 CCTF-kriterier. Når selvevalueringen skal genereres, kan systemet for hvert kriterie hente alle de datapunkter der dokumenterer det, validere mod kriteriets krav, og udstede en dækningsgrad.

## Kerneentiteter

### Kommune

Basisentitet. Bærer kommunekode, navn, befolkningstal, areal, og overordnede klimakommitments (kriterie 1). Knytter sig til alt andet via kommune_id.

Felter: `id`, `kommunekode`, `navn`, `befolkningstal`, `areal_km2`, `klimakommitment_dato`, `klimakommitment_tekst`, `recertificeringsdato`, `seneste_selvevaluering_id`.

### Indsatsområde

Repræsenterer en sektorstrategi eller indsatsområde i klimaplanen (kriterie 11). Et indsatsområde har en sektor, en type, knyttede mål og knyttede tiltag.

Felter: `id`, `kommune_id`, `navn`, `type` (drivhusgasreduktion / klimatilpasning / forbrug / retfærdig_fordeling / tværgående), `sektor` (energi / transport / byggeri / fødevarer / landbrug / affald / klimatilpasning / andet), `forbrugskategori_tag` (kun hvis type=forbrug), `ansvarlig_forvaltning`, `beskrivelse`, `aktiv`.

### Mål

SMART-mål eller kvalitative mål knyttet til et indsatsområde (kriterie 8, 9, 10, 11). Et mål kan være på kort, mellem eller lang sigt.

Felter: `id`, `indsatsområde_id`, `type` (SMART / kvalitativt), `tidsramme` (kort / mellem / lang), `målår`, `målværdi`, `enhed`, `baseline_værdi`, `baseline_år`, `beskrivelse`, `kategori` (reduktion / tilpasning / merværdi / forbrug).

### Tiltag

Den tungeste entitet og den der bærer mest data. CCTF kriterie 12 stiller minimumskrav til alle tiltag, og kriterie 14 stiller udvidede krav til prioriterede tiltag på kort sigt.

Basisfelter (kriterie 12): `id`, `kommune_id`, `titel`, `beskrivelse`, `type` (reduktion / tilpasning / begge), `tidsramme_start`, `tidsramme_slut`, `tovholder_id`, `ansvarlig_organisation` (intern eller ekstern), `forventet_effekt_co2_ton`, `forventet_effekt_kvalitativ`, `status` (planlagt / igangværende / gennemført / udgået), `prioriteret_tiltag` (boolean).

Cross-cutting tags på tiltag: `beføjelseskategori` (virksomhed / leverandør / myndighed / facilitator), `avoid_shift_improve` (undgå / skift / forbedre), `forbrug_kategori` (hvis relevant), `retfærdig_fordeling_relevant` (boolean), `udfaser_fossile_brændsler` (boolean - kriterie 13).

Udvidede felter for prioriterede tiltag (kriterie 14): `understøttende_tiltag`, `implementeringsplan`, `milepæle` (struktureret liste), `omkostninger_detaljeret`, `finansieringstilgang`, `fordeling_gevinster_byrder`, `kommunikationsplan`, `barrierer`.

### Indikator

Måler fremdrift på tiltag, mål eller indsatsområder (kriterie 15). Skal kunne tagges som output, outcome eller impact.

Opdeles i to lag:

**Indikatordefinition (katalog, delt på tværs af kommuner)** — implementeret som `indikator_template`. Bærer `beskrivelse`, `enhed`, `datakilde_type`, `api_kilde`, `api_query`, `aggregeringsformel` og CCTF-mapping. Det er definitionen af fx "andel fjernvarmedækning" eller "antal elbiler pr. 1000 indbyggere". Fælles og kan auto-hentes. Bør også bære `niveau` og `cctf_kriterier`-array (delvist implementeret).

**Indikatorinstans (per kommune)** — implementeret som `kommune_indikator`. Knytter en katalogdefinition til kommunen, bærer fetch-status og kan tilpasses med `visningsnavn`.

Bemærk: Det nuværende katalog (`indikator_template`) kræver `api_kilde` som notNull og dækker kun auto-hentede indikatorer. Manuelle indikatorer oprettes direkte i `indikator`-tabellen uden template. For fuld benchmarking (V3) bør `indikator_template` udvides til også at rumme manuelle katalogdefinitioner.

Felter på `indikator` (instansdatapunktet): `id`, `niveau` (output / outcome / impact), `beskrivelse`, `enhed`, `datakilde_type` (manuel / api), `api_kilde` (hvis api: klimaregnskab / energidataservice / bbr / dst / klimaatlas / kamp / hip), `api_query` (hvis relevant), `aggregeringsformel` (hvis sammensat).

Indikatorer knyttes til tiltag, mål eller indsatsområder via separate junction-tabeller (M:M).

### Interventionslogik_kobling

Binder output-indikatorer til outcome-indikatorer og outcome til impact, så systemet kan pege på hvilken effekt der er i fare når en output-indikator skrider (kriterie 14, 15). Uden denne kobling kan systemet vise at noget skrider, men ikke hvad det betyder for målopfyldelsen.

Felter: `id`, `fra_indikator_id`, `til_indikator_id`, `indsatsomraade_id` (kontekst), `beskrivelse`.

Importér default-kæder fra Klimaalliancens monitoreringssystem frem for at bede hver kommune bygge dem fra bunden.

### Indikator_måling

Tidsserietabel der bærer faktiske målinger over tid. Det er her data lander når de hentes fra eksterne API'er.

Felter: `id`, `indikator_id`, `monitoreringscyklus_id` (FK til Monitoreringscyklus), `dato`, `år`, `værdi`, `kilde`, `bemærkning`, `auto_hentet` (boolean).

Bemærk: Den nuværende implementering har unique constraint `(indikator_id, aar)` — én måling pr. år. Indførelse af `Monitoreringscyklus` kræver at denne ændres til `(indikator_id, monitoreringscyklus_id)`, som giver mulighed for kvartalsvis kadence.

### Tovholder

Den person i kommunen der er ansvarlig for at rapportere status på et eller flere tiltag. Hver tovholder har et unikt rapporteringslink.

Felter: `id`, `kommune_id`, `navn`, `forvaltning`, `email`, `unikt_link_token`, `aktiv`. M:M-relation til tiltag.

### Tovholder_rapport

Den strukturerede statusindberetning fra tovholder, gennemført fx kvartalsvist eller ad hoc.

Felter: `id`, `tovholder_id`, `tiltag_id`, `monitoreringscyklus_id` (FK til Monitoreringscyklus), `dato`, `status_implementering` (procent eller kategori), `status_beskrivelse`, `barrierer`, `næste_skridt`, `effekt_realiseret` (hvis relevant).

### Monitoreringscyklus

Grupperer en runde af monitorering og giver et rent snapshot til sammenligning over tid. Understøtter to rytmer: den lette årlige monitorering og den tunge 5-årlige evaluering (CCTF kriterie 15, 16).

Felter: `id`, `kommune_id`, `navn` (fx "Årsstatus 2025", "Q1 2026"), `periode_start`, `periode_slut`, `type` (aarlig / kvartal / ad_hoc), `status` (aaben / lukket / rapporteret).

Både `Tovholder_rapport` og `Indikator_måling` knyttes til en `Monitoreringscyklus` via `monitoreringscyklus_id`. Det giver en konfigurerbar kadence (kommunen sætter selv om de kører årligt eller kvartalsvist) og et naturligt ophæng for den årlige Klimastatus-generering.

> **Åbent: rapport-fastfrysning (Kausal-fund, 2026-06-29).** "Snapshot" ovenfor er i dag kun en *logisk* gruppering — den fryser ikke tilstanden. Når en cyklus lukkes (`status → lukket/rapporteret`), bør tilstanden af de tiltag og indikatorer rapporten bygger på **fastfryses immutabelt**, så en afleveret Klimastatus kan gengives identisk for evigt, selvom records ændres bagefter. Kausal Watch løser det med versions-snapshots (django-reversion); vi gør det på vores måde — fx separate immutable snapshot-rækker skrevet ved cyklus-luk. Afgørende for revisionssikker rapportering og recertificering. Bygges i Fase 6, men arkitekturen besluttes tidligt (påvirker hvordan cyklus-koblet data skrives). Se `docs/research/2026-06-29-kausal-funktion-features-ux.md` og rapporterings-fasen i `docs/superpowers/specs/2026-06-15-datadrevet-cctf-platform-design.md`.

### Læringspost

Det manglende "L" i MERL. Fanger kæden fra observation til beslutning og binder monitoreringen til den næste planrevision. Uden den er platformen et MER-værktøj der monitorerer og rapporterer, men ikke lærer (kriterie 15).

Felter: `id`, `kommune_id`, `monitoreringscyklus_id`, `knyttet_til_type` (tiltag / indsatsomraade / maal), `knyttet_til_id`, `observation` (hvad blev set), `fortolkning` (hvad betyder det), `beslutning` (viderefoeres / justeres / udgaar / tilfoeres_ressourcer / eskaleres), `beslutningstager`, `dato`, `tovholder_rapport_id` (reference til det der udløste læringen, nullable).

Posten genereres løbende ud fra monitoreringen — når en tovholder melder en barriere, kan koordinatoren omsætte den til en dokumenteret justeringsbeslutning på stedet. Den konsumeres af den 5-årlige CCTF-evaluering og af den næste planrevision.

CCTF-mapping: en `Læringspost` mappes til kriterie 15 via `cctf_kriterie_mapping` på samme måde som tiltag og indikatorer.

### Aktør

Repræsenterer interessenter (kriterie 3 og 4). Tagges efter de tre grupper fra kriterie 3.

Felter: `id`, `kommune_id`, `navn`, `type` (intern / ekstern / borger / virksomhed / forsyning / civilsamfund / andet politisk niveau), `gruppe_tag` (M:M med: påvirkes_af_klimaforandringer / påvirkes_af_klimatiltag / har_magt_indflydelse), `inddragelsesform`, `inddragelsesfrekvens`, `påvirkning_på_plan_tekst`.

### Sårbar_gruppe

Knytter sig til kriterie 7 og 10. Dokumenterer hvilke grupper der er udsatte for klimaforandringer eller skæv fordeling.

Felter: `id`, `kommune_id`, `gruppe_kategori` (lavindkomst / ældre / børn / funktionsvariation / etnicitet / geografi / andet), `beskrivelse`, `vidensgrundlag_kilde`, `relevant_for_klimafarer` (M:M), `relevant_for_indsatsområder` (M:M).

### Klimafare

Kriterie 5. Dokumenterer hvilke klimafarer der er identificeret i kommunen.

Felter: `id`, `kommune_id`, `type` (oversvømmelse / tørke / hede / storm / havvandsstigning / terrænnært_grundvand / andet), `sandsynlighed`, `hyppighed`, `intensitet`, `tidsskala`, `rumlig_fordeling_geometri` (GeoJSON eller reference), `datakilde` (klimaatlas / hip / kamp / lokalanalyse), `data_dato`, `data_version`.

### Konsekvensvurdering

Knytter klimafarer til berørte sektorer, systemer og grupper.

Felter: `id`, `klimafare_id`, `berørt_kategori` (sektor / system / infrastruktur / sårbar_gruppe), `berørt_id` (foreign key til den berørte entitet), `konsekvens_beskrivelse`, `alvor` (lav / mellem / høj), `tilpasningskapacitet` (lav / mellem / høj).

### Drivhusgasregnskab_post

GPC-kompatibelt regnskab på sektorniveau (kriterie 6). Trækkes fra Klimaregnskabet.dk.

Felter: `id`, `kommune_id`, `år`, `gpc_sektor` (Scope 1 / 2 / 3 + sektorkode), `udledning_ton_co2e`, `datakilde`, `gpc_kompatibel` (boolean), `metodeversion`.

### Scenarie_post

BAU og tiltagsscenarier (kriterie 6). Dokumenterer den fremskrevne udledning.

Felter: `id`, `kommune_id`, `scenarie_type` (bau / tiltag), `år`, `sektor`, `udledning_ton_co2e`, `metode_beskrivelse`, `tiltag_id` (hvis reduktionen kobler til et specifikt tiltag).

### Beføjelses_vurdering

Skabelon 1.1 fra vejledningen. Strukturer kommunens vurdering af om de bruger deres tilgængelige beføjelser tilstrækkeligt.

Felter: `id`, `kommune_id`, `indsatsområde_id`, `rolle` (virksomhed / leverandør / myndighed / facilitator), `aktive_tiltag_count`, `udnyttelsesvurdering_tekst`, `mangler_tekst`, `dato`.

### CCTF_kriterie_mapping

Den centrale junction-tabel der gør auto-evaluering mulig. Hver række kobler en specifik entitet (tiltag, indikator, mål, etc.) til et CCTF-kriterie.

Felter: `id`, `entitet_type` (tiltag / mål / indikator / aktør / klimafare / sårbar_gruppe / scenarie / etc.), `entitet_id`, `kriterie_nr` (1-16), `dokumentationsstyrke` (primær / sekundær), `bemærkning`.

### Selvevaluering

> **Udfaset 2026-06-15** — entiteten er ikke længere i aktiv brug (tabellen står dormant). Bevaret som historik.

Den genererede selvevalueringsskabelon. Versioneres så historik kan ses.

Felter: `id`, `kommune_id`, `version`, `genereret_dato`, `godkendt_af`, `godkendelsesdato`, `kriterie_1_status` (komplet / delvis / manglende), `kriterie_1_dokumentation_tekst`, `kriterie_1_supplerende_argumentation`, ... og så videre for alle 16 kriterier.

## Beslutningsport

En valideringsregel, ikke en ny entitet. Enhver aktiv `kommune_indikator`-instans skal være knyttet til mindst ét `Mål` eller ét prioriteret `Tiltag` via junction-tabelerne `indikator_maal` eller `indikator_tiltag`. Instanser uden kobling flages i UI'et som "forældreløse" og tæller ikke med i dækningsgraden for kriterie 15.

Dette er den mekanisme der holder indikatorsættet skarpt over tid og forhindrer at systemet vokser sig ubrugeligt (jf. kriterie 14's krav om indikatorer for prioriterede tiltag).

Implementeres som en query der returnerer forældreløse instanser — ingen schema-ændring.

## Cross-cutting tags på tværs af entiteter

Tre dimensioner går på tværs af næsten alle kriterier. De skal være tags der kan sættes på flere entiteter, ikke separate entiteter.

**Beføjelseskategori** (de fire kommunale roller): sættes på tiltag, partnerskaber og indsatsområder. Lader UI'et vise hvor mulighedsrummet ikke er udnyttet.

**Retfærdig fordeling**: sættes på vidensgrundlag, mål, tiltag og indikatorer. CCTF kriterie 7 og 10 kræver at retfærdighed væves igennem hele indsatsen, ikke ligger som separat kapitel. Cross-cutting tagging gør det muligt at hente alt der knytter sig til retfærdighed på tværs.

**Forbrugskategori**: sættes på sektorstrategier, mål, tiltag og indikatorer. Krav fra kriterie 6 om minimum to forbrugskategorier dokumenteret.

## Datakilde-mapping til CCTF-kriterier

Følgende offentlige datakilder integreres direkte. For hver kilde defineres hvilke datapunkter den leverer og hvilke CCTF-kriterier den dokumenterer.

| Datakilde | Leverer | CCTF-kriterier | Opdatering |
|-----------|---------|----------------|------------|
| Klimaregnskabet.dk (Energi- og CO2-regnskabet) | GPC-kompatibelt CO2-regnskab pr. sektor pr. år | Kriterie 6 | Årligt |
| Energidataservice | Energiforbrug, vedvarende energi, fjernvarmedækning | Kriterie 6, 11, 15 | Realtid eller dagligt |
| BBR | Bygningsmasse, varmekilder, alder | Kriterie 11, 15 | Ugentligt eller månedligt |
| Danmarks Statistik (fx BIL710) | Elbiler, transport, demografi, socioøkonomi | Kriterie 6, 7, 11, 15 | Månedligt eller årligt |
| DMI Klimaatlas | Klimascenarier til 2050, klimafarer | Kriterie 5 | Versionsbaseret |
| KAMP | Klimatilpasning, arealanvendelse | Kriterie 5, 11 | Versionsbaseret |
| HIP | Hydrologi, terrænnært grundvand | Kriterie 5 | Periodisk |
| Klimaalliancens monitoreringssystem | National kontekst, sammenligningsdata | Kriterie 15, 16 | Årligt |
| Energistyrelsens Global Afrapportering | Forbrugsudledninger, baseline til lokal nedskalering | Kriterie 6, 9 | Årligt |

For hver indikator i systemet specificeres hvilken datakilde den henter fra og med hvilken frekvens. Det giver to fordele: kommunen ser altid hvor data kommer fra, og når en kilde ændrer sig (ny version af DMI Klimaatlas, fx) kan systemet automatisk markere alle berørte indikatorer for genvurdering.

## Dækningsgrad-logik pr. kriterie

Hjertet i auto-evalueringen. For hvert af de 16 kriterier defineres en valideringsregel der ser på den knyttede dokumentation og udstedet en status.

Eksempel for kriterie 6 (vidensgrundlag for reduktion):

```
MUST:
  - Eksisterer GPC-kompatibelt drivhusgasregnskab maksimalt 3 år gammelt?
  - Eksisterer BAU-scenarie?
  - Eksisterer tiltagsscenarie?
  - Eksisterer mindst 1 indikator for hver af mindst 2 forbrugskategorier?
SHOULD:
  - Eksisterer kvalitativ analyse af tilgængelige beføjelser (skabelon 1.1 udfyldt)?
  - Er restudledning og manko transparent rapporteret?
ALTERNATIVE:
  - Hvis manglende, kan kommunen tilføje fri argumentation for alternativ tilgang
```

Eksempel for kriterie 15 (MERL-system):

```
MUST:
  - Mindst 1 output-indikator pr. prioriteret tiltag
  - Mindst 1 outcome-indikator pr. indsatsområde
  - Mindst 1 impact-indikator pr. overordnet mål
  - Indikatorer for mindst 2 forbrugskategorier
  - Mindst 1 retfærdighedsindikator
SHOULD:
  - Klimahændelse-monitorering aktiveret
  - Indikatorer auto-opdateres fra eksterne datakilder hvor muligt
```

For hvert kriterie returnerer valideringen en af tre statusser: komplet, delvis, manglende. Den genererede selvevaluering viser status pr. kriterie, lister hvilke datapunkter der dokumenterer det, og peger på hvad der mangler.

Kommunen kan tilføje supplerende argumentation hvor de har en alternativ tilgang. Den fri tekst gemmes på selvevalueringen og medtages i den eksporterede dokumentation.

## Implementation prioritering

Bygges i tre lag svarende til MVP, V2 og V3.

**MVP (måned 1-4)**

Nødvendige entiteter: Kommune, Indsatsområde, Mål, Tiltag (kun basisfelter), Tovholder, Tovholder_rapport, Indikator, Indikator_måling, Drivhusgasregnskab_post, CCTF_kriterie_mapping, Selvevaluering.

Nødvendige integrationer: Klimaregnskabet.dk, BBR, Energidataservice, Danmarks Statistik.

Auto-evaluering for de "lette" kriterier hvor data primært ligger struktureret: 1, 2, 3, 4, 6 (delvis), 12, 15 (delvis), 16.

PDF-eksport af Klimastatus i kommunens skabelon.

**MERL-lag (V1.5 — efter MVP, før V2)**

MERL-entiteterne placeres her fordi de er afgørende for at platformen bruges *hele året* (ikke kun ved rapporteringstid) og for at dække det sværeste CCTF-krav (kriterie 15 — læring).

Prioritet 1 — høj værdi, ingen schema-konflikter:
- `Læringspost` som ny tabel (kobles til `cctf_kriterie_mapping` kriterie 15)
- Beslutningsport som UI-validering (forældreløse indikatorer flages)

Prioritet 2 — kræver schema-migrering:
- `Monitoreringscyklus` som ny tabel
- `monitoreringscyklus_id` på `Tovholder_rapport` og `Indikator_måling`
- Unique constraint på `Indikator_måling` ændres fra `(indikator_id, aar)` til `(indikator_id, monitoreringscyklus_id)`

Prioritet 3 — kræver dataimport fra Klimaalliance:
- `Interventionslogik_kobling` som ny tabel med default-kæder fra Klimaalliancens monitoreringssystem

**V2 (måned 5-9)**

Tilføjede entiteter: Klimafare, Konsekvensvurdering, Sårbar_gruppe, Beføjelses_vurdering, Aktør (fuld), Scenarie_post.

Tilføjede integrationer: DMI Klimaatlas, KAMP, HIP, Klimaalliancens monitoreringssystem (eksport af spørgeskemadata og interventionslogik-kæder).

Auto-evaluering for de tungere kriterier: 5, 7, 8, 9 (fuld), 10, 11, 13, 14, 15 (fuld inkl. Læringspost).

Eksterne aktørers input (kriterie 3 og 4) via separat input-flow.

**V3 (måned 10-15)**

Peer benchmarking på tværs af kommuner (forudsætter fuld katalog/instans-split for manuelle indikatorer).

Offentlig dashboard genereret fra samme datasæt (kriterie 16).

Forbrugsmodul med dybere indikatorer for valgte forbrugskategorier.

Klimatilpasnings-modul med kortvisualisering.

## Specifikke designvalg det er værd at bide mærke i

Tiltag bærer både den simple og den udvidede form. Boolean-flag `prioriteret_tiltag` afgør hvilke ekstra felter der vises i UI. Det undgår dobbeltentitet.

Indikatorer er separate entiteter, ikke felter på tiltag. Det lader samme indikator dokumentere flere tiltag og mål, hvilket er den faktiske virkelighed (fx CO2-reduktion fra fjernvarmesektoren dokumenterer både et specifikt tiltag og et overordnet sektormål).

CCTF_kriterie_mapping er en bevidst denormalisering. Det havde været teknisk renere at have separate koblingstabeller pr. entitetstype, men én generisk tabel gør auto-evalueringskoden væsentlig simplere. Performance-prisen er marginal indtil 100+ kommuner på platformen.

Geografi (rumlig fordeling af klimafarer, sårbare grupper, tiltag) håndteres som GeoJSON i tekstfelter i V1. PostGIS-integration kan komme i V3 hvis det viser sig nødvendigt.

Versionering af selvevaluering bevares så kommunen kan se historikken, men aktiv selvevaluering er altid den nyeste.

## Det her er en arbejdsskitse

Datamodellen vil ændre sig under bygning, og det er normalt. Det vigtige er at de tre arkitektoniske beslutninger holder: kriterier som rygrad via mapping-tabel, cross-cutting tags der ikke er separate entiteter, og separate indikator-entiteter der kan dokumentere flere ting.

Hvis de tre er på plads, kan resten ændres uden at det vælter projektet.
