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

### Hvor opmærksomheden ligger (men byg drives af friktion, ikke af gæt)
- **Data (#1) + kobling (#3) er skelettet.** En indikator betyder kun noget når den er fersk *og* koblet. Fundament.
- **Tovholder-status (#2) er kødet på skelettet** — giver først mening oven på koblede handlinger, og er allerede tættest på færdig.
- "Vurderet hul" ovenfor er **hypoteser, ikke byggeordrer.** Hvilke der faktisk bygges afgøres af Trin 3 (validér-så-byg), ikke af denne tabel.

---

## Scope — den opdaterede plan (validér-så-byg)

Princip: systemet er allerede live og næsten komplet. I stedet for at bygge skelet-features på et gæt og validere bagefter, får vi ægte data ind, kører den rigtige løkke på **det eksisterende system**, og lader den empiriske friktion definere hvad der bygges. Vend "byg-så-validér" til "validér-så-byg".

### Trin 0 — Oprydning (trivielt)
- Slet de 5 tomme `" 2"`-sync-konfliktmapper (`lib/widgets/* 2`, `app/(app)/k/[kommune] 2`) — stammer fra iCloud-sync af `Documents`, ikke git-trackede.
- **Behold** backward-compat redirects `app/(app)/dashboard/` og `/indstillinger/` — de er bevidste, ikke ghost-ruter.

### Trin 1 — Fang baseline (før vi rører noget)
*Måleinstrumentet skal kalibreres mens virkeligheden er frisk.*

- Skriv den nuværende proces ned for hver af de tre tidsrøvere: hvilke mapper/dokumenter/regneark, hvor mange trin, og **hvor lang tid det reelt tager** (fx sidste tovholder-runde i timer).
- Dette er målestokken for "før/efter". Uden den kan vi ikke ærligt påstå en tidsbesparelse senere.
- Lille leverance: en kort baseline-note (kan ligge i `docs/`), ikke kode.

### Trin 2 — On-ramp: struktureret Excel/CSV-import
*Engangsbekvemmelighed, ikke daglig tidsbesparer — timebox hårdt, overinvestér ikke.*

- Standard import-skabelon med kendte kolonner: `indsatsområde, sektor, type, tiltag-titel, tiltag-status, beskrivelse` (+ evt. `tovholder-navn, tovholder-email`).
- **Deterministisk parser** (`xlsx` er allerede dependency): direkte kolonne-mapping. Ingen AI, ingen 60k-afkortning, ingen hallucinering.
- Forhåndsvisning før commit: "Importerer N indsatsområder og M tiltag — bekræft." Tomme/ugyldige rækker flages eksplicit.
- Eksisterende AI-import (PDF/Word) **bevares** uændret; den nye strukturerede sti vælges for regneark.
- Sideeffekt: opfylder onboarding-kravet — enhver fremtidig kommune onboardes trivielt med skabelonen.
- Kun nok data ind til at kunne køre én ægte løkke (Trin 3) — ikke hele kataloget på én gang.

### Trin 3 — Kør den ægte løkke på det eksisterende system
*Det vigtigste trin. Validering, ikke byg.*

- Onboard nok ægte Thisted-data (via Trin 2), kør én fuld driftsløkke på det system der allerede findes: find/opdatér data, indsaml tovholder-status, gennemgå koblingen handling ↔ mål ↔ indikator.
- **Notér hver eneste friktion** mens du gør det — hvert sted hvor du leder, kopierer manuelt, eller ikke kan se hvad der mangler.
- Resultatet er en **prioriteret friktionsliste**. Den — ikke hypotese-tabellen ovenfor — er specen for Trin 4.

### Trin 4 — Byg det friktionen udpeger
- Byg præcis de skelet-fixes (data-friskhed synlig, kobling-overblik, tovholder-overblik …) som Trin 3 rangerede øverst. Intet spekulativt.
- Forventet tyngdepunkt: data-friskhed (#1) + kobling-overblik (#3) — men Trin 3 har sidste ord, inkl. hvis tovholder-overblik (#2) gør mere ondt end vurderet.
- Følg `additivt-klar, ikke præ-abstraheret` (se princip nedenfor).
- Hvad der ikke når at blive bygget her, føder næste spec.

---

## Tværgående princip: skalerbarhed

Brugeren har en pipeline af udvidelser: **scope 3-regnskab, forbrugsbaseret regnskab for borgere, databank** m.fl. Intet af dette bygges nu (YAGNI), men intet i denne plan må foregribe dem negativt.

Konkret regel: **nye datakilder, regnskabstyper og indikator-arter skal være additive — følg de registry-mønstre der allerede findes.**
- Datakilder følger fetch-job-mønstret (`lib/jobs/fetch-*.ts` + boss-registrering) — en ny kilde (BBR, DMI, scope 3-leverandør, databank) er en ny modul-fil, ikke en omskrivning.
- Regnskabstyper må ikke hardkodes til den nuværende type i `db/schema/regnskab.ts` — scope 3 og forbrugsbaseret er nye typer der skal kunne tilføjes additivt.
- Indikator-kobling (Trin 2) skal kunne rumme flere kilde-/regnskabstyper uden skemabrud.

Når byggearbejdet (Trin 4) designes, vælges modeller der tåler disse tilføjelser uden migration-smerte.

**`Additivt-klar, ikke præ-abstraheret`:** Følg de eksisterende mønstre så scope 3 / databank kan slottes ind — men byg ikke den generiske ramme før den *anden* rigtige brugssag findes. Vi må ikke bruge sommeren på arkitektur til features der ikke er besluttet.

---

## Bevidst uden for scope (denne runde)

- Byrådsrapport og AI-tekstgenerering (afkræftet som essentiel).
- CCTF-selvevaluerings-AI (Fase 3b-stub forbliver stub — ikke en daglig tidsrøver).
- Fase 6-kilder (BBR/DMI Klimaatlas/KAMP) bygges **ikke spekulativt** — kun on-demand hvis et konkret Thisted-indikator kræver det.
- Scope 3, forbrugsbaseret borgerregnskab, databank — fremtidige specs; her kun sikret additivt.
- Offentlig side til Thisted (intern pilot først).

---

## Succeskriterier

- [ ] **Baseline fanget:** den nuværende proces og dens tidsforbrug er skrevet ned *før* byggearbejdet — målestokken findes.
- [ ] De 5 sync-junk-mapper er væk; redirects bevaret; intet ser i stykker ud.
- [ ] Thisteds rigtige handlingskatalog kan importeres fra Excel/CSV deterministisk med forhåndsvisning, uden datatab.
- [ ] **Den ægte løkke er kørt** på det eksisterende system med rigtige Thisted-data, og har produceret en prioriteret friktionsliste.
- [ ] De øverste friktioner fra listen er bygget (forventet: data-friskhed synlig + kobling-overblik — men listen bestemmer).
- [ ] Mindst én tilbagevendende opgave kan beskrives med en **målt** før/efter-tidsbesparelse (mod baselinen).
- [ ] Ingen del af modellen blokerer additivt for scope 3 / forbrugsregnskab / databank.
