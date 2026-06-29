# Datadrevet CCTF-platform — samlet udviklingsplan

**Dato:** 2026-06-15
**Status:** Plan til godkendelse (afventer prioritering → implementeringsplaner pr. fase)
**Bygger på beslutning:** Selvevaluering udfaset, CCTF bevaret som rapporteringsrygrad (se `AGENTS.md`).
**Kildegrundlag (verificeret):** `2026-06-16-cctf-evidensgrundlag.md` — side-citeret evidens for hvert tal, regel og princip nedenfor (citatnøgle `[Dx s.n]`). Indeholder også §12 (præciseringer til denne plans tekst) og §13 (nye indsigter, fx sektor-intervaller og det nationale monitoreringssystem).

**Afsæt — fire kilder + websøgning, dybdeanalyseret 2026-06-16** (oprindeligt to, udvidet med selvvurderingsskema, certificeringsoverblik og C40/KL-research — se evidensgrundlaget §1):
- **CCTF-revisionsvejledningen** (CONCITO/C40, *Vejledning til revision og certificering af klimahandlingsplaner*, v1.0, 07.11.2024) — **kravene**: hvad en god plan skal kunne, regler, rytme, skabeloner.
- **CO₂-analysen** (Ea Energianalyse + CONCITO, *Analyse af kommunernes CO₂-reduktionsbidrag til 70%-målet i 2030*, DK2020, marts 2024, 96 kommuner) — **det empiriske indhold**: de tiltag og indikatorer kommunerne faktisk bruger, plus nationale benchmarks.

---

## Kernetese

**Vejledningen fortæller, hvad platformen skal kunne. Analysen forærer det konkrete indhold at fylde i.** Sammen gør de det muligt at omdanne CCTF fra et dokument, man rører hvert 4.–5. år, til en **løbende sammenhængs-rygrad** — fodret af nationale kataloger som udgangspunkt og lokal bottom-up data til styring. Hver af de tre søjler (styring af handlinger, rapportering, indgang til data) får et konkret løft, og produktet kan levere nationalt, autoritativt indhold fra dag ét i stedet for tomme skabeloner.

## Bærende principper (gælder på tværs af alle faser)

1. **CCTF = sammenhæng, ikke checkliste.** Dækning betyder: holder kæden *mål → tiltag → indikator* pr. sektor og klimafare, og er alle fire kommunale roller i spil? — ikke "er kriteriet krydset af". (Kilde: kæden = bilag 5/skabelon 5.1; rolle-matricen = bilag 1/skabelon 1.1.)
2. **Nationalt katalog som start, lokal bottom-up til styring.** Top-down/nationale data = baggrundstæppe + benchmark; bottom-up/lokale data = det, man rent faktisk styrer efter. Begge bruges — lokal data giver lokal indsigt — men de må ikke forveksles. Hvert datapunkt bærer et eksplicit flag. (Kilde: Bilag 5's bottom-up/top-down-skel: nationale data "informerer i mindre grad om udviklingen lokalt".)
3. **Årlig rytme + flerårig læring** (grundig evaluering/revision hvert 4.–5. år, min. hvert 5. år), knyttet til konfigurerbare politiske milepæle (budgetforhandling, kommunalvalg) frem for én fast dato. (Kilde: afsnit 1.1 + kriterie 15.)
4. **"Altid recertificerings-klar"** via løbende validering og friskheds-flag — platformen advarer, *før* noget forælder.
5. **Spejl Klimaalliancens fælles monitoreringssystem, dupliker det ikke** — så kommunen indrapporterer én gang. (Kilde: kriterie 15.)

---

## Faseplan

Hver fase er mærket med type (lille/mellem/stor indsats), søjle og hvilke CCTF-kriterier den styrker.

### Fase 1 — Nationale kataloger + kommunetype-klassifikation
**Type:** Lille–mellem · **Søjle:** Handlinger + Data · **Kriterier:** 11, 12, 14, 15

Platformen mangler i dag et fælles handlingskatalog og har kun en håndfuld indikatorer. CO₂-analysen lukker begge huller næsten færdigpakket.

- **Kommunetype:** adoptér Danmarks Statistiks 5 kommunetyper (land-, oplands-, provinsby-, storby-, hovedstadskommune) som felt på kommunen. Fuld mapping af alle 98 kommuner findes i analysen.
- **Handlingskatalog:** seed 46 navngivne standardtiltag (energi/transport/landbrug/scope 3) med empirisk udbredelses-% og kommunetype-tag. Eksempler: *konvertering af olie-/gasfyr til fjernvarme/varmepumpe* (99%), *skovrejsning* (78%), *understøtte ladeinfrastruktur* (85%), *udtag af lavbundsjorde* (70%), *CCS* (32%). Bliver til "foreslåede tiltag for din kommunetype" ved onboarding — ikke et blankt ark.
- **Indikatorkatalog:** seed de 9 omstillingsindikatorer som delte templates på outcome/impact-niveau, hver med enhed **og national målværdi som indbygget benchmark**:

| Indikator | Enhed | National målværdi (ref.) |
|---|---|---|
| Udfasning af naturgas til rumvarme | % af gasforbrug | 100% i 2035 |
| Indfasning af elbiler | % af bilpark | 23% rene (2030) |
| Elproduktion fra solceller | GWh/år | ~27.000 |
| Elproduktion fra land-/kystvind | GWh/år | ~23.000 |
| Udtag af lavbundsjorde | ha | 80.000 |
| Skovrejsning | ha | 60.000 |
| Biogas | GWh/år | 14.500 |
| PtX | GWh/år | 17.500 |
| CCS | kt CO₂/år | 3.200 |

**Værdi:** hurtigere onboarding fra et kurateret udgangspunkt (rammer "spar uger om året"); fundamentet for benchmarking (Fase 5).

### Fase 2 — Datahub: indikator-metadata, top-down/bottom-up, flere kilder
**Type:** Mellem · **Søjle:** Data · **Kriterier:** 6, 15

Det er her, datapointen fra vejledningen lever. Vi trækker bevidst på meget lokal data — det giver lokal indsigt — men disciplinen er at mærke hvert datapunkt, så styring og kontekst aldrig forveksles.

- Udvid indikator-modellen med metadata pr. serie:
  - **kilde** (manuel / API),
  - **top-down vs bottom-up** (national/modelleret kontekst vs. lokal/operationel styring),
  - **aggregeret vs operationel** (fx CO₂-regnskab vs. antal konverterede oliefyr),
  - **kvalitetskriterier** (repræsentation, komplethed, pålidelighed, målbarhed, økonomi — fra Bilag 5),
  - **friskhed/alder** (hvornår sidst opdateret).
- Én indikator kan bære **både** en top-down serie (benchmark/baggrund) og en bottom-up serie (styring), tydeligt mærket — så man ser, hvad man kan styre efter, og hvad der kun er kontekst.
- Wire flere datakilder ud over de tre nuværende (Klimaregnskabet, Energidataservice, DST): **BBR** (bygningsmasse, varmekilder) er den nærmeste mangel bag flere af katalog-indikatorerne. (DMI Klimaatlas/KAMP/HIP hører til tilpasningssporet i Fase 7.)

**Værdi:** den "data hub", der gør lokal og national data brugbar *side om side* uden at sammenblande styring og facit.

### Fase 3 — Hårde regler & friskheds-validering
**Type:** Lille–mellem · **Søjle:** alle · **Kriterier:** 6, 8, 12, 13, 15, 16

Vejledningen er fuld af konkrete, tjekbare regler. De bliver til validering og flag:

- Drivhusgasregnskab **≤ 3 år gammelt**; klimarisikovurdering **≤ 5 år** (data ≤ 10 år).
- Et 2030-mål **under det beregnede sektorinterval** → advarsel "kan ikke godkendes" (intervaller findes i analysen/vejledningen pr. sektor).
- Netto-nul senest 2050 + **mindst 2 delmål**; **mindst 2 forbrugskategorier**; fossile kraftværker udfaset **før 2030**; **alle reduktioner koblet til et tiltag**.
- Årlig offentlig rapportering forfalder (påmindelse).

**Værdi:** billig troværdighed. Platformen holder aktivt kommunen "altid recertificerings-klar" og siger til, før noget forælder.

### Fase 4 — Sammenhængs-motor (CCTF-dækning reframe)
**Type:** Mellem–stor · **Søjle:** alle (rygraden) · **Kriterier:** alle 16

Opgrader "CCTF-dækning" fra kriterie-tælling til en **kohærens- og hul-finder** (kæden: bilag 5/skabelon 5.1; rolle-matricen: bilag 1/skabelon 1.1):

- Pr. sektor / klimafare: er kæden *mål → tiltag → indikator* hel? Vis brudte led som konkrete handlingspunkter ("dette mål har ingen indikator", "dette tiltag har intet mål").
- **Rolle×sektor-matrix:** er alle fire kommunale roller (virksomhed/leverandør/myndighed/facilitator) i spil på tværs af sektorerne — og er **alle fire** brugt i fossil-udfasnings-kolonnen (den eneste hvor det er hårdt krav, kriterie 13)?
- En "hvad mangler"-visning afløser den passive dækningsprocent.
- **Kausal-inspireret UX (valgfrit visuelt lag):** kæden kan vises som et *insight-netværk* — mål/tiltag/indikatorer som noder forbundet med kausale links, så et brudt led ses visuelt og en skridende output-indikator kan spores til det mål den truer. Vi har allerede relationen (`Interventionslogik_kobling`); dette er den visuelle realisering. Kan udskydes — listevisningen af huller er minimumskravet, grafen er løftet. (Se `docs/research/2026-06-29-kausal-funktion-features-ux.md`.)

**Værdi:** den løbende, året-rundt-værdi, der retfærdiggør at beholde CCTF efter selvevalueringen — selve den røde tråd i drejningen.

### Fase 5 — Benchmarking (sektorkorrigeret, peer)
**Type:** Mellem · **Søjle:** Data + Rapportering · **Kriterier:** 15

- Pr. omstillingsindikator: "kommune X opnår Y% af den nationale målandel" + peer-gennemsnit for samme kommunetype.
- Gennemsnitligt reduktionsmål pr. kommunetype som reference: storby 90% · hovedstad 80% · provinsby 76% · land 71% · oplands 70%.
- **Sektorkorrigeret:** sammenlign ikke rå mål-procenter — en landkommunes 71% er ikke "mindre ambitiøst" end en storbys 90%, fordi handlerummet afhænger af sektorprofilen.

**Værdi:** stærkt politisk og salgsmæssigt argument internt i kommunen.

### Fase 6 — Rapportering & offentlig transparens
**Type:** Stor · **Søjle:** Rapportering (den tyndeste i dag) · **Kriterier:** 16

- **Klimastatus-rapporten** til kommunalbestyrelsen — det manglende output — genereret fra samme datasæt.
- **Rapport-fastfrysning (Kausal-fund — primær funktionel mangel i dag):** når en `Monitoreringscyklus` lukkes, **fryses tilstanden af hvert tiltag og hver indikator på det tidspunkt** (immutable snapshot-data i vores stak — ikke Kausals django-reversion). En afleveret Klimastatus skal kunne gengives identisk for evigt, også selvom underliggende records ændrer sig bagefter. Uden dette kan et dokument til kommunalbestyrelsen ændre sig under hånden — uacceptabelt for rapportering og recertificering. Understøtter direkte "altid recertificerings-klar". **Bemærk arkitektur-rækkefølge:** beslut dette tidligt (det påvirker hvordan cyklus-koblet data skrives), selvom det bygges her.
- **Indikator-UX (Kausal-fund):** vis *mål-vs-faktisk* (national målværdi fra Fase 1 som målstreg oven på den lokale kurve) og *normalisering* (fx pr. indbygger). Billigt, stor læsbarhedsgevinst for kommunalbestyrelsen — "−12% siden 2020, mål −30%" i stedet for et nøgent tal.
- **Offentligt dashboard pr. kommune** (KPI'er, fremdrift, tiltagsstatus). Kriterie 16 kræver *aktiv, bred formidling på årlig basis*, ikke kun en KB-dagsorden. Widget-fundamentet til den offentlige side findes allerede. Kausal-fund: tænk to-målgruppe (internt styringsværktøj vs. tilgængelig (WCAG) offentlig udgave + indlejrelige widgets) og CSV/Excel/PDF-eksport som førsteklasses feature.
- Dæk alle tre spor: drivhusgasreduktion, klimatilpasning og merværdi/retfærdig fordeling.
- Spejl Klimaalliancens årlige indrapportering, så kommunen ikke skal rapportere dobbelt.

**Note:** Forretningskritisk søjle. Kan rykkes tidligere i rækkefølgen, hvis rapport-outputtet prioriteres som det vigtigste demo-/salgsargument.

### Fase 7 — Strukturelle udvidelser: tilpasning, interessenter, equity
**Type:** Stor · **Søjle:** Handlinger + Data · **Kriterier:** 3, 4, 5, 7, 8, 10

De tre steder, hvor platformen er tyndest — og som CCTF netop har skærpet:

- **Klimafare/risikovurdering-entitet** — hele tilpasningssporet (fare → konsekvens → mål → tiltag → indikator), datakilde-versioneret (DMI Klimaatlas, KAMP, HIP). Tilpasning er løftet til ligeværdighed med reduktion og kræver nu både kvalitative *goals* og kvantitative *SMART targets*.
- **Interessent-entitet** — en aktørkortlægning (3 grupper × 2 spor + inddragelse). Tovholder ≠ interessent. (Bilag 2, kriterie 3+4.)
- **Equity fra flag til struktur** — merværdi-mål (natur/social/økonomisk), fordelingsdimensioner (adgang/økonomi/placering) og sårbar-gruppe-tags. (Bilag 4, kriterie 7+10.)

**Værdi:** fuldender CCTF-dækningen på de skærpede områder; stærk differentiering. Analysen bekræfter, at det haster: **landbrug+areal og transport står for 98% af restudledningen i 2030** — præcis de sektorer, hvor kommunen har mindst direkte magt og mest brug for at synliggøre sine begrænsede håndtag.

---

## Datahub — uddybning (det bærende dataprincip)

Fordi platformen kommer til at trække på meget lokal data (det giver lokal indsigt), er den afgørende disciplin **mærkning**, ikke fravalg:

- **To lag, samme indikator:** et *kontekst/benchmark-lag* (top-down, nationalt, modelleret — fx CO₂-regnskabet, nationale måltal) og et *styringslag* (bottom-up, lokalt, operationelt — fx tovholdernes tal på konkrete tiltag).
- **Hvorfor nationale data ikke kan stå alene til styring:** de er ofte top-down nedskalerede (afspejler national udvikling lagt ned over kommunen, ikke kommunens egne tiltag), kommer med 1–2 års forsinkelse og kun årligt, er aggregerede frem for operationelle, og har lille/støjende signal lokalt. De er fremragende som baggrund og benchmark — men man styrer på det lokale, rettidige, handlingsnære.
- **Konsekvens for modellen:** top-down/bottom-up og aggregeret/operationel skal være eksplicitte flag på indikatoren (Fase 2), så visning, dækningsberegning (Fase 4) og benchmarking (Fase 5) kan behandle dem forskelligt.

---

## Bevidst uden for scope

- **Selvevaluerings-dokumentet** — udfaset (se `AGENTS.md`). CCTF bevares kun som rammeværk.
- **Forbrugsbaseret CO₂-regnskab** — ikke et CCTF-krav; vi nyttiggør i stedet eksisterende forbrugsindikatorer (min. 2 kategorier).
- **At duplikere Klimaalliancens monitoreringssystem** — vi spejler og fodrer det.
- **Kortvisualisering/PostGIS** for klimafarer — udskydes (GeoJSON i tekst indtil behov, jf. datamodellen).
- **Fuld repositionering af landingsside/produktbeskrivelse** — bevidst udskudt (separat opgave).

---

## Kausal-fund — indarbejdelse (research → faser)

Research af Kausal Watch (funktion/features/UX, ikke kode) i `docs/research/2026-06-29-kausal-funktion-features-ux.md`. **Tilgang: foldet ind i de eksisterende faser — intet separat "Kausal-spor".** Fundene var enten validering af planlagt arbejde eller berigelser; ét var et reelt hul.

| Kausal-fund | Hjem i roadmap | Karakter |
|---|---|---|
| **Rapport-fastfrysning** (snapshot ved cyklus-luk) | **Fase 6** (beslut arkitektur tidligt) | **Reelt hul** — primær |
| Insight-netværk (visuel kæde) | Fase 4 (valgfrit visuelt lag) | Berigelse — vi har modellen |
| Indikator mål-vs-faktisk + normalisering | Fase 6 (bygger på Fase 1's målværdier) | Berigelse — billig, høj effekt |
| To-målgruppe-UX + embeds + eksport | Fase 6 (offentligt dashboard) | Forstærker eksisterende plan |
| Handlings-"forside" (tidslinje/opgaver/log) | Eksisterende tiltag-arbejdsrum | Validering — polish, ikke ny fase |
| Interaktive scenarie-skydere (Kausal Paths) | — | Fravalgt nu (fremtidig) |

**Eneste rækkefølge-konsekvens:** rapport-fastfrysning *bygges* i Fase 6, men *besluttes* nu, fordi den afgør om cyklus-koblet data skal kunne snapshottes immutabelt. Alt andet følger den eksisterende fase-rækkefølge uændret.

## Anbefalet rækkefølge & næste skridt

1. **Fase 1 + Fase 3** først — konkrete, høj værdi, lav fortolkningsrisiko (seed katalogerne + læg de hårde regler ind).
2. **Fase 2** (datahub) — underbygger både benchmarking og sammenhængs-motoren; brugerens udpegede prioritet.
3. **Fase 4** (sammenhængs-motor) — den centrale reframe af CCTF.
4. **Fase 5 + Fase 6** — benchmarking og rapportering (rapport-outputtet kan rykkes frem efter forretningsbehov).
5. **Fase 7** — strukturel køreplan til at fuldende CCTF-dækningen.

Hver fase brydes til en separat implementeringsplan i `docs/superpowers/plans/`, når den tages op.

## Succeskriterier (overordnede)

- [ ] Nyt katalog: en ny kommune ser foreslåede tiltag for sin kommunetype + de 9 omstillingsindikatorer ved onboarding.
- [ ] Hver indikator-serie er mærket top-down/bottom-up og aggregeret/operationel.
- [ ] Platformen flagger forældede data (regnskab > 3 år, risikovurdering > 5 år) og mål under sektorinterval.
- [ ] "CCTF-dækning" viser konkrete huller i mål→tiltag→indikator-kæden og rolle×sektor-matricen, ikke kun en procent.
- [ ] Benchmarking viser kommunen mod peer-gennemsnit (kommunetype), sektorkorrigeret.
- [ ] Tilpasnings-, interessent- og equity-sporene har egne entiteter (Fase 7).
- [ ] En lukket Klimastatus-rapport gengives identisk over tid (tilstand fastfrosset ved cyklus-luk).
