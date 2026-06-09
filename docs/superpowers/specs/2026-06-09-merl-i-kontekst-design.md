# MERL i kontekst — tiltag-arbejdsrum, tovholder-forespørgsler og review-lag

**Dato:** 2026-06-09
**Status:** Godkendt design, klar til implementeringsplan
**CCTF-kriterie:** 15 (MERL — monitorering, evaluering, rapportering, læring)

## Problem

MERL er i dag organiseret forkert i forhold til hvordan arbejdet faktisk foregår:

- **`/laering` er en silo.** Registrering af læringsposter sker på en selvstændig side med en fritstående form, hvor koordinatoren selv skal gen-vælge hvilket tiltag posten hører til via en dropdown. Det dekontekstualiserer arbejdet — præcis den fejltilstand MERL-dokumentet advarede mod ("L'et bliver en aspiration; en side ingen besøger").
- **Tiltag-siden er "dum".** `tiltag/[id]/` har kun en `rediger/`-form til stamdata. Et klik på en tiltag-række går direkte dertil ([tiltag-table.tsx:227](../../../app/(app)/k/[kommune]/tiltag/tiltag-table.tsx)). Siden viser intet om tiltagets indikatorer, målinger, barrierer eller læring.
- **Tovholder-indsamling er ufokuseret.** Magic-link-flowet findes ([rapport/[token]/route.ts](../../../app/rapport/[token]/route.ts), [rapport/page.tsx](../../../app/rapport/page.tsx)), men tovholderen ser *alle* sine tiltag i én stor form i stedet for ét konkret, isoleret spørgsmål. Koordinatoren kan ikke spore "anmodet/afventer/forfalden", ikke trigge fra tiltag-konteksten, og der er ingen konfigurerbar kadence.

Kriterie 15 er eksplicit om at enheden er **tiltaget**: indikatorerne vurderer "implementering af tiltag og fremskridt på output-, outcome- og impactniveau." Det naturlige hjem for indikatorer, monitorering, barrierer og læring er derfor den enkelte handling — ikke en parallel side.

Datamodellen understøtter det allerede fuldt ud (ingen migration nødvendig for kerneflytningen): alt hænger på `tiltagId` — indikatorer ([indikatorTiltag](../../../db/schema/indikator.ts)), målinger ([indikatorMaaling](../../../db/schema/indikator.ts)), barrierer ([tovholderRapport.tiltagId](../../../db/schema/tovholder.ts)), læringsposter (polymorf → `type='tiltag'`), effekter og tovholdere.

## Princip

**Platformen skal gøre arbejdet nemmere — ikke være et datalager.** Det væsentligste først, venlige knapper og visualiseringer, detaljer via progressive disclosure. Gælder på tværs af alle sider.

## Mental model: tre flader, to roller

> **Indhent i isolation · fang i kontekst · gennemgå i overblik.**

| Flade | Rolle | Hvor | Hvad |
|-------|-------|------|------|
| 1. Indhent i isolation | Tovholder | Magic-link mail → `/rapport` | Ét snævert, konkret spørgsmål ad gangen. Intet login, ingen platform. |
| 2. Fang i kontekst | Koordinator | **Ny** `tiltag/[id]` | Alt om netop denne handling samlet — status, indikatorer, barrierer, læring. Arbejdsrummet. |
| 3. Gennemgå i overblik | Koordinator | `/laering` (slankes) | Tværgående triage: barriere-indbakke, beslutningsport, årlig opsamling. Aldrig indtastning. |

Tovholdere får aldrig adgang til platformen. De besvarer isolerede micro-forms udløst af koordinatoren manuelt eller af en konfigurerbar timer.

---

## Flade 2 — Tiltag-arbejdsrummet (`tiltag/[id]`)

Ny route `app/(app)/k/[kommune]/tiltag/[id]/page.tsx`. Bliver den nye destination ved klik på en tiltag-række (i dag → `/rediger`). Layout som **omvendt pyramide**.

### A. Statushoved (altid synligt — "ét blik")
- Titel + indsatsområde-tag
- **Implementeringsstatus** som farvekodet chip. Basistilstand kommer fra `tiltag.status`-enum (`planned`→"Ikke startet", `in_progress`→"I gang", `completed`→"Gennemført", `discontinued`→"Udgået"). **"Forsinket" er en afledt overlay**, ikke en enum-værdi: vises når `tidsrammeSlut < i dag` og status ∉ {`completed`, `discontinued`}. Seneste tovholder-rapports `statusImplementering` (fritekst) vises som *narrativ tekst* under chippen — ikke som chippen selv.
- **Effekt**: forventet effekt som tal (sum fra `tiltag_effekt`, som tiltag-tabellen allerede beregner). Seneste `tovholderRapport.effektRealiseret` (fritekst) vises som narrativ ved siden af hvis udfyldt. **Ingen numerisk realiseret-vs-forventet-progressbar** — schemaet har ingen struktureret realiseret-værdi (afledt sammenligning kræver en impact-indikator-konvention, noteret som fremtid).
- **Tovholder(e)** med "sidst opdateret [dato]" + **rødt "forældet"-flag** når der ikke er hørt noget inden for tærsklen (konfigurerbar, ikke hårdkodet)
- **Åbne barrierer**: antal, rødt hvis > 0

### B. Primærhandlinger (store, venlige knapper — easy-easy-easy)
- **"Indhent status"** → opretter en `forespoergsel` scopet til (tovholder, dette tiltag) og sender magic-link mail. Viser "sidst anmodet [dato]" og advarer ved nylig anmodning (anti-spam).
- **"Skriv læringspost"** → inline form, allerede bundet til tiltaget (`knyttetTilType='tiltag'`, `knyttetTilId=id`). Ingen dropdown.

### C. Sektioner — progressive disclosure (kun essensen når sammenfoldet; max én foldet ud ad gangen)
1. **Indikatorer & målinger** (output/outcome/impact) — pr. indikator: seneste måling vs. target med trend-pil (↑/↓) og farve. Handlinger: "Registrér måling", "Tilføj indikator".
2. **Tovholder-rapporter** — tidslinje; seneste foldet ud, ældre sammenfoldet. Status · barrierer · næste skridt.
3. **Læring** — læringsposter for dette tiltag, nyeste først, med beslutnings-chip.
4. **Stamdata & effekter** — read-only resumé med "Rediger" → eksisterende `/rediger`-form (uændret).

### Backend
- Ét fokuseret query-modul `getTiltagDetalje(id)` i `db/queries/`, der batcher med `Promise.all` (tiltag-stamdata inkl. `status`+`tidsrammeSlut`, indikatorer+seneste måling, tovholder-rapporter inkl. `effektRealiseret`, læringsposter, effekt-sum, tovholdere, seneste/åbne forespørgsler). Undgår N+1. Status-chip og forsinket-overlay beregnes i et rent hjælpemodul (`lib/merl/tiltag-status.ts`), så det er enheds-testbart.
- Tovholder-rapporter og læring sorteres nyeste-først i query-laget.

### UX-greb (gælder på tværs)
Farvekodede chips, trend-pile, progressbars, "forældet"-advarsler, guidende tomme-tilstande ("Ingen indikatorer endnu — tilføj den første"), ikon+tekst-knapper.

---

## Flade 1 — Tovholder-forespørgslen (skærpes)

### Ny tabel `forespoergsel`
```
forespoergsel
  id                    uuid pk
  kommuneId             uuid → kommune (cascade)
  tovholderId           uuid → tovholder (cascade)
  tiltagId              uuid → tiltag (cascade)
  monitoreringscyklusId uuid → monitoreringscyklus (nullable; sat ved timer-trigger)
  spoergsmaal           text (nullable; valgfri konkret fritekst fra koordinator)
  status                forespoergsel_status ('sendt' | 'besvaret' | 'forfalden')
  sendtAt               timestamptz default now
  besvaretAt            timestamptz (nullable)
  createdAt             timestamptz default now
```
Ny enum `forespoergselStatusEnum = ['sendt', 'besvaret', 'forfalden']`.

**Kobling til svar:** Ny nullable kolonne `forespoergselId uuid → forespoergsel (set null)` på `tovholderRapport`. Tovholderens svar opretter en `tovholderRapport` for samme tiltag med `forespoergselId` sat, og forespørgslen sættes `besvaret` + `besvaretAt`. Svaret lander dermed automatisk på tiltag-arbejdsrummet og i barriere-indbakken via den eksisterende `getBarriereInbox`.

**Magic-link og scope:** Magic-link-tabellen ændres *ikke* strukturelt — sessionen forbliver per-tovholder (eksisterende [encryptTovholder](../../../lib/tovholder-session.ts)). Sikkerhedsgarantien er at `/rapport` kun henter **denne tovholders egne** åbne forespørgsler (filtreret på `tovholderId` fra sessionen) — en tovholder kan aldrig se andres tiltag. Den årlige/periodiske trigger sender **én mail pr. tovholder** (ikke én pr. tiltag); linket fører til `/rapport`, der lister alle tovholderens åbne forespørgsler. Manuel "Indhent status" fra ét tiltag opretter én forespørgsel for dét tiltag og sender én mail.

### Konfigurerbar kadence (koordinator-styret)
Den automatiske status-indhentning skal kunne sættes af koordinatoren til: **månedlig · kvartalsvis · halvårlig · årlig · manuel (slukket)**.

- Ny enum `indhentningsKadenceEnum = ['maanedlig', 'kvartalsvis', 'halvaarlig', 'aarlig', 'manuel']`.
- Gemmes som **kommune-niveau standard** (ny kolonne på `kommune` eller en lille settings-tabel — vælges i plan), redigerbar i `indstillinger`. Default `aarlig`.
- Manuel ad-hoc afsendelse via "Indhent status" på tiltag-siden er **altid** tilgængelig uanset kadence.
- Per-tiltag override er **out of scope** (noteres til V2).

### Timer-trigger
Bygger på eksisterende `ensureAarligCyklus` ([monitorering.ts:7](../../../db/queries/monitorering.ts)), generaliseret til den valgte kadence: ved periodeskift oprettes/genbruges en `monitoreringscyklus`, og der fyres `forespoergsel`-rækker til alle relevante (tovholder, tiltag)-par. Afsendelsen kører via pg-boss, som i dag er **no-op** (jf. roadmap) — leveres derfor som korrekt kode bag et flag/stub, ikke som falsk-fungerende automatik. Manuel afsendelse virker fuldt fra dag ét.

### Tovholderens flade (`/rapport`)
Ombygges fra "udfyld alle dine tiltag" til **"besvar denne forespørgsel"**: tiltagets titel, koordinatorens evt. konkrete spørgsmål, to felter (status for implementering + barrierer), gem. Hvis tovholderen har flere åbne forespørgsler, vises de som en kort liste man arbejder sig igennem — én ad gangen.

### Forfalden — afledt, ikke cron-afhængig
En forespørgsel er "forfalden" når `status='sendt'` og `sendtAt` er ældre end et svarvindue. Da pg-boss er no-op, **beregnes forfalden afledt ved læsning** (samme mønster som "forsinket"-overlayet) i stedet for at kræve en cron der skriver `forfalden` til DB. Enum-værdien `'forfalden'` bevares til når en scheduler senere kan persistere den, men UI'et afhænger ikke af den. Synligt på tiltag-siden så koordinatoren ved at rykke.

---

## Flade 3 — `/laering` som rent review-lag

Den fritstående "Ny læringspost"-form **fjernes** fra [laering/page.tsx](../../../app/(app)/k/[kommune]/laering/page.tsx) (oprettelse flyttet til tiltag). Tilbage står tre tværgående triage-blokke:

1. **Barriere-indbakke** — barrierer der venter på en beslutning. Eksisterende [BarriereKort](../../../app/(app)/k/[kommune]/laering/_barriere-kort.tsx) genbruges. "Behandl" → beslutning (læringspost knyttet til tiltaget).
2. **Beslutningsport** — forældreløse indikatorer; flyttes/spejles fra dagens `/data`.
3. **Årlig opsamling** — alle beslutninger i den aktuelle cyklus → input til byrådsrapport.

Læringsposter oprettes **kun** på tiltag-siden. `/laering` *behandler* kun barrierer til beslutninger. De to akter holdes visuelt adskilte.

---

## Afgrænsning (out of scope)
- Læring på mål-/indsatsområde-niveau (den polymorfe model bevares, men UI'et til det bygges ikke nu).
- Per-tiltag kadence-override (kun kommune-standard nu).
- Reel pg-boss-baseret auto-afsendelse i produktion (leveres som stub bag flag; manuel afsendelse virker).

## Selvkritisk review

**UX-risici**
- *Detaljesiden bliver selv en datadynge* — den værste fejl. Modgift: statushovedet bærer essensen; kun én sektion foldet ud ad gangen. Eskalér til faner hvis det stadig føles tungt.
- *To steder at "lære"?* Oprettelse kun på tiltag-siden; `/laering` behandler kun barrierer. Skal være visuelt utvetydigt.
- *Spam-risiko ved "Indhent status"* — knappen viser "sidst anmodet" og advarer ved nylig anmodning.
- *"Forældet"-flag kan virke nagende* — tærskel konfigurerbar, ikke hårdkodet.

**Backend-risici**
- *Query-fan-out* på detaljesiden — løses med ét batchet `getTiltagDetalje(id)`.
- *Polymorf læringspost uden FK* — flytningen gør oprettelser altid `type='tiltag'` (mere robust).
- *Forældreløse forespørgsler* — eksplicit `forfalden`-overgang, ikke kun 'sendt'.
- *Timer afhænger af pg-boss (no-op)* — leveres bag flag/stub; ingen falsk tryghed.
- *Magic-link-scope* — sessionen er per-tovholder; `/rapport` filtrerer forespørgsler på `tovholderId`, så en tovholder aldrig ser andres tiltag. Ingen strukturændring af magic-link-tabellen.
- *Status-chip uden FK-validering* — "forsinket" er en ren visuel afledning af `tidsrammeSlut`; den skriver ikke til `tiltag.status` og kan derfor ikke korruptere den autoritative tilstand.

## Acceptkriterier
1. Klik på en tiltag-række åbner et arbejdsrum (`tiltag/[id]`), ikke redigeringsformularen.
2. Arbejdsrummet viser i et statushoved: status-chip fra `tiltag.status` med afledt "forsinket"-overlay, forventet effekt-sum, tovholder + forældet-flag, åbne barrierer — og indikatorer/rapporter/læring i progressive-disclosure-sektioner.
3. "Skriv læringspost" opretter en post forudbundet til tiltaget uden dropdown.
4. "Indhent status" sender en magic-link forespørgsel scopet til tiltaget; status spores (sendt/besvaret/forfalden) og vises.
5. Tovholderens `/rapport` viser én forespørgsel ad gangen med koordinatorens evt. spørgsmål; svaret lander på tiltag-siden og i barriere-indbakken.
6. Koordinatoren kan i indstillinger vælge kadence (månedlig/kvartalsvis/halvårlig/årlig/manuel); manuel afsendelse virker altid.
7. `/laering` indeholder ikke længere en fritstående oprettelses-form; kun barriere-indbakke, beslutningsport og årlig opsamling.
