# Kausal — fund: funktion, features og UX (arbejdsdokument)

> **Status:** arbejdsdokument / research, 2026-06-29. Ikke en beslutning og ikke et schema.
> **Vinkel bevidst valgt:** *funktion, features og UX* — ikke kode. Kausal bygger det i
> Python/Django + React; det er irrelevant for os. Spørgsmålet er hvad produktet *gør for
> brugeren*, og hvad vi vil gøre på vores egen måde (Next.js/TS-stak) hvis det giver værdi.
> **Licens:** alle Kausal-kerne-repos er AGPL-3.0 = foreneligt med os. Vi må læse, lære og
> genbruge. Watch-UI's licens kræver kreditering af "Helsinki Climate Watch" i brugervendt
> materiale *hvis* UI-kode genbruges direkte — irrelevant hvis vi kun låner koncepter.

## Hvorfor Kausal er den rigtige at studere

Kausal Watch er reelt det nærmeste internationale sidestykke til klimastatus.dk: et webværktøj
hvor kommuner/organisationer **overvåger deres egne klimahandlinger**, viser fremdrift offentligt,
og rapporterer. De har kørt det i produktion i årevis (Carbon-neutral Helsinki 2035, San Diego m.fl.).
De har altså allerede løst en masse af de UX-problemer vi er på vej ind i — og vi kan se deres
løsninger, fordi alt er open source.

**Gå selv og kig på det levende produkt** (bedre end nogen kodelæsning):
- `watch.kausal.us` — San Diego Climate Action (offentlig dashboard + handlinger + rapport-PDF)
- `api.web.kausal.tech` — Kausals egen demo ("Climate Strategy Evaluation and Publishing Tool")
- `kausal.tech/products/kausal-watch` — produktbeskrivelse (bemærk: blokerer scrapere, åbn i browser)

---

## Del 1 — Kausal Watch: feature- og UX-inventar

Afdækket via produktbeskrivelser + frontend-komponentstrukturen i `kausal-watch-ui`
(`src/components/`, 16 feature-områder). Hvert punkt er en *funktion brugeren oplever*.

### A. Handlingsoverblik (deres `actions`)
Det er kernen, og det er rigt. Komponenterne afslører feature-niveauet:
- **Handlingskort + handlingsliste** — browsbar katalog over alle tiltag (`ActionCard`, `ActionCardList`, `ActionsTable`). Både kort-visning og tabel-visning.
- **Handlings-detaljeside** med: status-badge, **fase-tidslinje** (`PhaseTimeline` — viser hvilken fase tiltaget er i over tid), impact-visualisering (`ActionImpact`), ansvarlige parter (`ResponsibleList`), kontaktpersoner, opgaveliste (`TaskList`), opdaterings-/aktivitetslog (`ActionUpdatesList`, `ActionLogBanner`), CO₂-scope-ikon, og relaterede handlinger.
- **Filtre** (`ActionListFilters`) — filtrér på kategori, fremdrift, ansvarlig part.
- **Fremhævede handlinger** (`ActionHero`, `ActionHighlightCard`) — redaktionel kuratering af "se især disse".
- **PDF-eksport pr. handling** (`ExportActionPdfButton`).

> **UX-lektie:** en handling er ikke bare en række i en tabel — den har en *forside* med tidslinje,
> ansvar, opgaver og en synlig historik. Det er forskellen på et registreringssystem og et
> styringsværktøj folk faktisk besøger.

### B. Dashboard (deres `dashboard`)
- **Status-grafer** (`ActionStatusGraphs`) — fordeling af tiltag på status (til tiden / forsinket / gennemført).
- **Status-tabel** (`ActionStatusTable`, `ActionTableRow`) med tooltips — sorterbart overblik.
- **Eksport af status** (`ActionStatusExport`) — CSV/Excel til offline-brug.
- KPI-summering øverst: "X% af tiltag i gang, Y gennemført".

> **UX-lektie:** dashboardet besvarer ét spørgsmål i ét blik — *hvordan går det med planen?* —
> og lader brugeren bore ned derfra. Eksport til regneark er en feature, ikke en eftertanke.

### C. Indikatorer (deres `indicators`) — meget dybt
- **Tidsserie-visualisering** (`IndicatorVisualisation`) — graf over tid.
- **Mål vs. faktisk** — målstreg lagt oven på den faktiske kurve.
- **Fremdriftsbjælke** (`IndicatorProgressBar`) — hvor langt mod målet.
- **Normalisering** (`IndicatorNormalizationSelect`) — vis fx pr. indbygger i stedet for absolut.
- **Sammenligning** (`IndicatorComparisonSelect`) — flere indikatorer side om side.
- **Indikator-modal** (`IndicatorModal`) — fuld-skærm detaljevisning uden at forlade siden.
- **Datatabel** (`IndicatorTable`) — de rå tal under grafen, med enhed og trend-retning.
- **Værdi-summering** (`IndicatorValueSummary`) — "seneste værdi + ændring siden sidst".

> **UX-lektie:** normalisering og mål-vs-faktisk er præcis det en kommunalbestyrelse skal bruge
> for at forstå et tal. "42.000 ton" siger intet; "−12% siden 2020, mål er −30%" siger alt.

### D. Insight-netværket (deres signatur-feature) — `insight` + `IndicatorCausalVisualisation`
Det mest distinkte ved Kausal. Handlinger og indikatorer tegnes som **en graf af noder forbundet
med kausale links** ("insight network"). Brugeren ser årsag-virkning: dette tiltag → driver denne
output-indikator → som påvirker denne outcome → som bidrager til dette mål. Man kan filtrere
(`InsightFilter`) og navigere kausalt (`CausalNavigation`) — klik på en node og følg kæden.

> **Direkte match til os:** dette er præcis vores `Interventionslogik_kobling` (output→outcome→impact)
> og det "interventionslogik"-krav CCTF kriterie 14–15 stiller. Kausal har bygget den *visuelle*
> oplevelse af det vi har modelleret. Når en output-indikator skrider, kan man *se* hvilket mål der
> kommer i fare. Det er en stærk UX-realisering af noget vi allerede har i datamodellen.

### E. Offentlig formidling + indlejring (deres `embed`, `home`, `contentblocks`)
- **Indlejrelige widgets** (`embed`) — samme data kan vises på kommunens egen hjemmeside, i en rapport eller på en infoskærm/kiosk.
- **Skræddersyet look** — den offentlige side tilpasses kommunens visuelle identitet.
- **Narrativt indhold** (`contentblocks`) — redaktionelle tekstafsnit mellem data, så en borger kan *læse* planen, ikke kun se tal.
- **Tilgængelighed:** WCAG 2.1 AA-compliant komponenter, Monsido-integration. (EU-krav — relevant for os som offentlig dansk tjeneste.)
- **Feedback-hooks** — borgere kan reagere.

> **UX-lektie:** to målgrupper, samme data. Tovholderen/koordinatoren ser styringsværktøjet;
> borgeren/politikeren ser en pæn, læsbar, tilgængelig offentlig udgave. Embeds gør at kommunen
> ikke skal vælge mellem "vores hjemmeside" og "klimastatus.dk".

### F. Rapportering med snapshot (deres `reports` + `versioning`)
Det vigtigste fund for os, fordi rapportering er vores tyndeste søjle. Funktionen, ikke koden:
- **Rapport-skabelon** kommunen selv konfigurerer (hvilke felter rapporten indeholder).
- **Rapport-instans** for en periode (fx "Årsstatus 2025") med start/slut og en **lås** (`is_complete`).
- **Fastfrysning:** når rapporten lukkes, **fryses den nøjagtige tilstand af hvert tiltag og hver
  indikator på det tidspunkt**. Rapporten kan gengives identisk for evigt — også selvom de
  underliggende data ændrer sig bagefter. (De gør det med version-snapshots; *vi gør det på vores
  egen måde* — fx immutable snapshot-rækker i Postgres når en `Monitoreringscyklus` lukkes.)
- **Versions-/sammenligningsvisning** (`versioning`) — se en handling som den så ud i en tidligere rapport vs. nu.
- **Regneark-/PDF-eksport** af hele rapporten (jf. San Diegos årsrapport-PDF).

> **UX-lektie + funktionel mangel hos os:** vores nuværende `Monitoreringscyklus` grupperer logisk,
> men datamodellen fryser ikke tilstanden. Uden fastfrysning kan en allerede afleveret Klimastatus
> ændre sig under hånden — uacceptabelt for et dokument der går til kommunalbestyrelsen og bruges i
> recertificering. Dette er den ene ting fra Kausal jeg mest direkte vil have ind hos os.

---

## Del 2 — Kausal Paths: scenarie-UX (sekundær relevans)

Paths er deres *fremskrivnings*-værktøj (emissioner mod 2050). Jeg kunne ikke hente feature-detaljer
fra repoet direkte (READMEn er setup-fokuseret), men produktets kendetegn er **interaktive
scenarie-kontroller**: brugeren skruer på parametre (udrulningstakt, tilslutningsgrad osv.) og ser
emissionskurven ændre sig live, med sektor-opdeling. Det er en "hvad-nu-hvis"-oplevelse.

> **Relevans for os:** lavere lige nu. Vores `Scenarie_post` og drivhusgasregnskab dækker behovet
> på data-niveau. Den interaktive scenarie-skyder er en mulig *fremtidig* feature hvis kommunerne
> vil lege med antagelser — men det er ikke en af de tre søjler. Noteres, prioriteres ikke.

---

## Del 3 — Mapping til vores tre søjler + anbefalinger

Søjlerne (jf. `AGENTS.md`): **(1) styring af handlinger · (2) rapportering · (3) indgang til data.**

| Kausal-feature | Vores søjle | Har vi det? | Anbefaling |
|---|---|---|---|
| Handlings-detaljeside m. fase-tidslinje, opgaver, log | 1 Styring | Datamodel ja, UX uafklaret | **Stjæl UX-mønsteret:** giv hvert tiltag en rigtig "forside" |
| Insight-netværk (kausal graf) | 1+2 | Model ja (`Interventionslogik_kobling`), visualisering nej | **Stærk kandidat:** visualisér interventionslogikken — stort CCTF 14–15-løft |
| Rapport-snapshot/fastfrysning | 2 Rapportering | **Nej (hul)** | **Højeste prioritet:** fastfrys tilstand ved `Monitoreringscyklus`-luk |
| Mål-vs-faktisk + normalisering på indikatorer | 2+3 | Delvist | **Stjæl:** normalisering + målstreg er must-have for politiker-læsbarhed |
| Dashboard m. status-fordeling + regneark-eksport | 1+2 | Delvist | Stjæl status-graf + CSV/Excel-eksport som standard |
| Offentlige embeds + narrativt indhold + WCAG | 2 | Uafklaret | Planlæg to-målgruppe-UX (intern styring vs. offentlig formidling) tidligt |
| Interaktive scenarie-skydere (Paths) | — | Nej | Fremtidig, ikke nu |

### Prioriteret anbefaling

1. **Rapport-fastfrysning (snapshot ved cyklus-luk).** Den ene reelle *funktionelle mangel* Kausal
   afslører. Gør Klimastatus-rapporten reproducerbar og revisionssikker → understøtter direkte
   "I er altid recertificerings-klar". Implementeres på vores måde (immutable snapshot-data), ikke
   deres (django-reversion).
2. **Visualisering af interventionslogik (insight-netværk).** Vi har allerede modellen; Kausal viser
   at den *visuelle* udgave er produktets mest distinkte feature og rammer det sværeste CCTF-krav.
3. **Indikator-UX: mål-vs-faktisk + normalisering.** Billig, høj effekt for læsbarhed hos
   kommunalbestyrelsen.
4. **To-målgruppe-tænkning + eksport.** Intern styring vs. offentlig, tilgængelig formidling — og
   CSV/Excel/PDF-eksport som førsteklasses feature, ikke eftertanke.

### Bevidst fravalgt (for nu)
- Interaktive Paths-scenarie-skydere — fremtidig.
- Konfigurerbare rapport-skabeloner via blocks — over-engineering før vi har én god fast skabelon.
- Direkte genbrug af `kausal-ui-common`-komponenter — værd at skimme når vi bygger dashboards, men ikke en beslutning nu.

---

## Næste skridt (forslag, ikke besluttet)
- Åbn `watch.kausal.us` og San Diego-rapport-PDF'en og vurdér UX'en med egne øjne.
- Hvis rapport-fastfrysning godkendes som retning: skriv den ind som note ved `Monitoreringscyklus`
  i `datamodel.md` og som et roadmap-punkt under rapporterings-søjlen.
- Beslut om interventionslogik-visualiseringen skal være en tidlig eller sen feature.

## Kilder
- Kausal Watch (Wikipedia): https://en.wikipedia.org/wiki/Climate_Watch_(Kausal_Ltd.)
- Kausal Watch produktside: https://kausal.tech/products/kausal-watch
- San Diego årsrapport (eksempel-output): https://watch.kausal.us/documents/696/2025-CPLAN-2024-CAP-Annual-Report_V04-FAW-SPREADS.pdf
- Kausal demo: https://api.web.kausal.tech/en/
- Repos: github.com/kausaltech/{kausal-watch, kausal-watch-ui, kausal-ui-common, kausal-paths, kausal-paths-ui}
