# Thisted intern pilot — den løbende driftsløkke

**Dato:** 2026-06-05
**Status:** Design godkendt, afventer spec-review før implementeringsplan
**Forgænger:** Roadmap `2026-05-21-roadmap-design.md` er stort set eksekveret (Fase 0–5 færdige). Denne spec afløser den som det nye kapitel.

---

## Hvorfor (værdiproposition — afstemt 2026-06-05)

Tidligere antagelse: kerneværdien var den AI-genererede årlige Klimastatus-rapport til byrådet. **Det er afkræftet.** Byrådsrapporten er ikke essentiel.

Den reelle værdi er at **frigøre klimakoordinatorens tid** — at erstatte en hverdag spredt over mange mapper og dokumenter med ét struktureret system der driver arbejdet. Konkret: gøre det nemt og hurtigt at finde data, koble handlinger smart sammen, og køre et overskueligt MERL-system.

Koordinatoren (i Thisted: brugeren selv) er både første kunde og måleinstrument. Værdien bevises kun ved at føre ægte Thisted-arbejde gennem systemet og måle den tid det sparer mod mappe-virkeligheden.

## Målbarhed

Ikke "det føles nemmere" — men målbar tid sparet på en konkret tilbagevendende opgave. Eksempel på den slags udsagn vi vil kunne sige bagefter:

> "Tovholder-runden tog før ~X timers jagt og copy-paste. Med systemet tager den ~Y."

Hver leverance i denne plan skal kunne knyttes til en sådan reduktion.

---

## De tre tidsrøvere (prioriteret af koordinatoren)

Koordinatoren udpegede tre — alle tre er den samme **løbende driftsløkke** set fra hver sin vinkel. CCTF-selvevaluering blev bevidst *ikke* udpeget (hvert ~4. år; ikke en daglig tidsrøver).

| # | Tidsrøver | Nuværende tilstand i koden | Vurderet hul |
|---|-----------|----------------------------|--------------|
| 1 | **Finde og holde data opdateret** | 3 auto-kilder (DST, Energidataservice, Klimaregnskabet) via pg-boss; `/data`-side; monitoreringscyklus | Manuelle indikatorer skal stadig findes/tastes; uklart om systemet signalerer forældede data |
| 2 | **Indsamle status fra tovholdere** | Magic links + rykker-mails (Brevo) + rapport-flow — mest færdigbygget | Overblik (hvem mangler) og automatik (rykker af sig selv) |
| 3 | **Koble handling ↔ mål ↔ indikator** | Mapping-tabeller, `indikator_maal`, `indikator_tiltag`, beslutningsport (flager forældreløse) | Mangler formentlig ét sted hvor hele vævet ses og styres |

### Afhængighedsorden (begrunder rækkefølgen nedenfor)
- **Data (#1) + kobling (#3) er skelettet.** En indikator betyder kun noget når den er fersk *og* koblet. Fundament.
- **Tovholder-status (#2) er kødet på skelettet** — giver først mening oven på koblede handlinger, og er allerede tættest på færdig.

---

## Scope — den opdaterede plan

### Trin 0 — Oprydning (trivielt)
- Slet de 5 tomme `" 2"`-sync-konfliktmapper (`lib/widgets/* 2`, `app/(app)/k/[kommune] 2`) — stammer fra iCloud-sync af `Documents`, ikke git-trackede.
- **Behold** backward-compat redirects `app/(app)/dashboard/` og `/indstillinger/` — de er bevidste, ikke ghost-ruter.

### Trin 1 — On-ramp: struktureret Excel/CSV-import
*Engangsbekvemmelighed, ikke daglig tidsbesparer — byg godt, men overinvestér ikke.*

- Standard import-skabelon med kendte kolonner: `indsatsområde, sektor, type, tiltag-titel, tiltag-status, beskrivelse` (+ evt. `tovholder-navn, tovholder-email`).
- **Deterministisk parser** (`xlsx` er allerede dependency): direkte kolonne-mapping. Ingen AI, ingen 60k-afkortning, ingen hallucinering.
- Forhåndsvisning før commit: "Importerer N indsatsområder og M tiltag — bekræft." Tomme/ugyldige rækker flages eksplicit.
- Eksisterende AI-import (PDF/Word) **bevares** uændret; den nye strukturerede sti vælges for regneark.
- Sideeffekt: opfylder onboarding-kravet — enhver fremtidig kommune onboardes trivielt med skabelonen.

### Trin 2 — Skelettet: data-friskhed + kobling-overblik
*Her er den daglige gevinst størst (mit gæt, som piloten be-/afkræfter).*

- **Data-friskhed synlig:** systemet råber op om forældede/manglende indikatorer — hvad er gammelt, hvad mangler kilde, hvad er manuelt og overskredet.
- **Kobling-overblik:** ét sted hvor vævet handling ↔ mål ↔ indikator kan ses og rettes (bygger på beslutningsportens forældreløse-logik, men gjort til et positivt styringsbillede, ikke kun et flag).

### Trin 3 — Mål friktionen på den ægte løkke
- Onboard Thisteds rigtige data (via Trin 1), kør én fuld driftsløkke igennem på ægte data.
- Den friktion du rammer ind i **er** den næste backlog. Lad piloten rangere de resterende fixes (inkl. om tovholder-overblikket #2 gør mere ondt end vurderet).
- Dette trin producerer input til *næste* spec — det forsøger ikke at forudspecificere ukendte fixes.

---

## Tværgående princip: skalerbarhed

Brugeren har en pipeline af udvidelser: **scope 3-regnskab, forbrugsbaseret regnskab for borgere, databank** m.fl. Intet af dette bygges nu (YAGNI), men intet i denne plan må foregribe dem negativt.

Konkret regel: **nye datakilder, regnskabstyper og indikator-arter skal være additive — følg de registry-mønstre der allerede findes.**
- Datakilder følger fetch-job-mønstret (`lib/jobs/fetch-*.ts` + boss-registrering) — en ny kilde (BBR, DMI, scope 3-leverandør, databank) er en ny modul-fil, ikke en omskrivning.
- Regnskabstyper må ikke hardkodes til den nuværende type i `db/schema/regnskab.ts` — scope 3 og forbrugsbaseret er nye typer der skal kunne tilføjes additivt.
- Indikator-kobling (Trin 2) skal kunne rumme flere kilde-/regnskabstyper uden skemabrud.

Når Trin 2 designes i implementeringsplanen, vælges modeller der tåler disse tilføjelser uden migration-smerte.

---

## Bevidst uden for scope (denne runde)

- Byrådsrapport og AI-tekstgenerering (afkræftet som essentiel).
- CCTF-selvevaluerings-AI (Fase 3b-stub forbliver stub — ikke en daglig tidsrøver).
- Fase 6-kilder (BBR/DMI Klimaatlas/KAMP) bygges **ikke spekulativt** — kun on-demand hvis et konkret Thisted-indikator kræver det.
- Scope 3, forbrugsbaseret borgerregnskab, databank — fremtidige specs; her kun sikret additivt.
- Offentlig side til Thisted (intern pilot først).

---

## Succeskriterier

- [ ] De 5 sync-junk-mapper er væk; redirects bevaret; intet ser i stykker ud.
- [ ] Thisteds rigtige handlingskatalog kan importeres fra Excel/CSV deterministisk med forhåndsvisning, uden datatab.
- [ ] Mindst ét Thisted-indsatsområde kører helt igennem på ægte data: koblede indikatorer med korrekte live-tal + rigtige tovholdere med virkende rapport-flow.
- [ ] Systemet gør forældede/manglende data synlige uden at koordinatoren skal lede.
- [ ] Der findes ét sted hvor koblingen handling ↔ mål ↔ indikator kan ses og styres.
- [ ] Mindst én tilbagevendende opgave kan beskrives med en målt før/efter-tidsbesparelse.
- [ ] Ingen del af modellen blokerer additivt for scope 3 / forbrugsregnskab / databank.
