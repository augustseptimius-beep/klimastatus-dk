# Fase 3 — Datafriskhed (value-first) — design

**Dato:** 2026-06-17
**Status:** Design til godkendelse → writing-plans
**Bygger på:** `docs/superpowers/specs/2026-06-15-datadrevet-cctf-platform-design.md` (Fase 3) + evidensgrundlag `2026-06-16-cctf-evidensgrundlag.md` §5 (hårde regler/tærskler).
**Kildegrundlag:** CCTF-tærsklerne `[evidensgrundlag §5]` sidder bagved som *viden*, men fasen rammesættes af **brugerværdi**, ikke compliance.

---

## 0. Den bærende beslutning (hvorfor denne fase ser anderledes ud end design-doc'ens Fase 3)

Design-doc'ens oprindelige Fase 3 var en **valideringsmotor**: gør CCTF's regler til flag, blokér mål under sektorinterval med "kan ikke godkendes". Det er forkast af to grunde besluttet under brainstorm 2026-06-17:

1. **Platformen certificerer ikke.** Recertificering foretages af CONCITO/C40 ved scoping-/certificeringsmøder `[§2.2]`. En kunde kan være netop certificeret — så "I kan ikke godkendes" er både forkert og tonedøvt.
2. **Fokus er værdi, ikke compliance.** Produktets kerneværdi er at *frigøre koordinatortid via den løbende driftsløkke* — ikke at krydse CCTF-bokse af. Hvert tjek skal kunne svare på "hvordan hjælper det koordinatoren?" — ellers ryger det ud.

**Resultatet:** Fase 3 bliver et lille, skarpt **datafriskheds-lag**: *"Platformen passer på jeres datagrundlag og siger til — i tide — når noget trænger til et kig."* CCTF-tærsklerne er kilden; sproget er hjælp, aldrig dom.

### Hvad der blev skåret eller flyttet (og hvorfor)

| Oprindelig regel | Beslutning | Begrundelse |
|---|---|---|
| 2030-mål under sektorinterval → "kan ikke godkendes" | **Flyttet til Fase 5** | Det er reelt en peer/benchmark-indsigt; hører hjemme hvor sektorkorrigeret sammenligning bygges. Også metodisk skrøbelig (basisår-normalisering `[§6.7]`). |
| Reduktioner uden tiltag | **Flyttet til Fase 4** | Det er en *sammenhængs*-tjek (hel kæde?), ikke en hård tærskel — Fase 4's domæne. |
| Min. 2 forbrugskategorier | **Skåret** | Ren afkrydsning; ingen daglig værdi for koordinatoren. |
| Fossile kraftværker før 2030 | **Skåret** | Intet rent datafelt + lav daglig værdi. |
| Risikovurdering > 5 år | **Udskudt** | `klimafare.dataDato` er fritekst og tynd data (Fase 7-territorium). |

---

## 1. Princip: sprog er hjælp, aldrig dom

Gennemgående regel for al tekst i dette lag:

- **Aldrig** "fejl", "ugyldigt", "kan ikke godkendes", "I opfylder ikke kriterium X".
- **Altid** en hjælpende ramme der forklarer *værdien*: *"Jeres regnskab er fra 2021 — nyere tal giver bedre styring og mere troværdige tal til byrådet."*
- **Proaktivt frem for reaktivt:** varslér *før* noget forælder (princip 4 i design-doc: *"advarer før noget forælder"*), ikke kun efter.

---

## 2. De tre friskheds-signaler (kernen)

Alle tre kører gennem **én** motor (samme "udløber om X"-logik, tre datatyper). Hvert signal har et **niveau**: `frisk` (grøn, vis intet eller diskret) · `snart` (gul, "forælder om X") · `forældet` (rød-tonet, men hjælpende sprog).

### 2.1 Emissionsdata forælder — **flagskibet** (NYT)
- **Hvad:** Kommunens drivhusgasregnskab er ved at blive (eller er) for gammelt til at styre og rapportere troværdigt på.
- **Tærskel (kilde):** CCTF anbefaler regnskab opdateret min. hvert 2.–3. år `[§5, D1 s.19]`. → `snart` når seneste dataår er 2 år gammelt; `forældet` ved 3+ år.
- **Datakilde — afklares i plan:** emissioner findes i to former: den strukturerede `drivhusgasregnskab_post.aar` *og* klimaregnskab-indikatorens målinger (`indikator_maaling.aar` for templates med `kilde='klimaregnskab'`). Friskheden beregnes som `nu − max(seneste dataår)`. Planen afgør hvilken kilde der er den autoritative (sandsynligvis den nyeste af de to).
- **Lander på:** /data (ved regnskabs-/CO₂e-blokken) + /dashboard (kort nudge).
- **Hvorfor det hjælper:** ingen pinlige gamle tal til byrådet; bedre styringsgrundlag.

### 2.2 Indikator-måling forælder — **proaktiv udvidelse af eksisterende** (UDVID)
- **Eksisterende:** `app/(app)/k/[kommune]/data/page.tsx` har allerede `StalenessStatus` der viser "Senest hentet: X dage siden" (gul/grøn) pr. indikator, baseret på `kommune_indikator.sidstHentet` (kun API-hentede).
- **Hvad vi tilføjer (ikke duplikerer):**
  1. **Proaktivt sprog:** "forælder om X" frem for kun "X dage siden".
  2. **Dækker manuelle indikatorer:** friskhed for manuelt indtastede måles på seneste `indikator_maaling.dato/aar`, ikke `sidstHentet` (som er null for manuelle).
  3. **Konsistent niveau-model** (frisk/snart/forældet) delt med de to andre signaler.
- **Tærskel:** afhænger af indikatorens forventede kadence (se 2.3) — en årlig indikator er "snart" tidligere end en månedlig. Default-tærskel hvis ukendt: planen fastsætter (fx snart > 400 dage, forældet > 550).
- **Lander på:** /data (erstatter/forbedrer `StalenessStatus`).

### 2.3 Tid til jeres opdatering — kadence-påmindelse (NYT)
- **Hvad:** Kommunen har en selvvalgt opdateringsrytme (`kommune.indhentningsKadence`: maanedlig/kvartalsvis/halvaarlig/aarlig/manuel). Påmind når en ny opdatering er due ift. seneste `monitoreringscyklus` (`periodeSlut`/`aar`, status lukket/rapporteret).
- **Logik:** næste-due = seneste lukkede cyklus' slutdato + kadence-interval. Niveau `snart` når den nærmer sig; niveau `forældet` når den er passeret (besked-ordlyd: "forfalden"). `manuel` kadence → intet signal.
- **Lander på:** /dashboard.
- **Hvorfor det hjælper:** koordinatoren slipper for selv at huske rytmen de har sat — kernen i at frigøre koordinatortid.

---

## 3. Bonus: fremdrifts-tjek (delmål)

Lille tilføjelse uden for friskheds-motoren:

- **Hvad:** Et reduktionsmål (typisk 2030/netto-nul) uden **delmål undervejs** betyder, at man ikke kan se om man er på sporet før det er for sent.
- **Data:** `getReduktionsMaal` giver det primære SMART-reduktionsmål; tæl reduktions-`maal` for kommunen — < 2 delmål → indsigt.
- **Sprog:** *"I har et mål for 2030, men ingen delmål undervejs — uden dem kan I ikke følge fremdriften løbende."*
- **Lander på:** /indsatser (ved målene).
- **Status:** engangs-setup-tjek, ikke dagligt — derfor *bonus*, ikke kerne. Kan udskydes hvis fasen skal holdes minimal.

---

## 4. Arkitektur

Designet for isolation: én ren motor, tynde sektions-renderinger.

### 4.1 Friskheds-motor (ren logik)
- **Fil:** `lib/datafriskhed/motor.ts` (nyt namespace — `lib/widgets/validering` er optaget af widget-config-sanering, ikke domæne).
- **Form:** rene funktioner uden DB-adgang. Tager allerede-hentede data, returnerer typede indsigter:
  ```ts
  type FriskhedsNiveau = 'frisk' | 'snart' | 'forældet';
  type Indsigt = {
    type: 'emissionsdata' | 'indikator' | 'kadence' | 'delmaal';
    niveau: FriskhedsNiveau;
    besked: string;        // hjælpende, value-first
    sektion: 'data' | 'dashboard' | 'indsatser';
    link?: string;         // hvor man retter det
    entitetId?: string;    // fx indikator-id, til inline-placering
  };
  ```
- Én funktion pr. signal (`emissionsdataFriskhed`, `indikatorFriskhed`, `kadenceFriskhed`, `delmaalTjek`) + en `beregnIndsigter(data): Indsigt[]` der samler. Hver er enhedstestbar mod kendte datoer/årstal (test injicerer "nu" — ingen skjult `Date.now()`).

### 4.2 Dataindsamling (query-lag)
- **Fil:** `db/queries/datafriskhed.ts` → `getDatafriskhed(kommuneId, nu): Promise<Indsigt[]>` der henter de nødvendige rækker (seneste regnskabsår, indikator-målinger + sidstHentet, seneste monitoreringscyklus + kommune.kadence, reduktionsmål/delmål) og kører motoren.
- "Nu" injiceres (parameter med default), så det er testbart og deterministisk.

### 4.3 Inline-rendering (sektioner)
- En lille delt komponent `components/datafriskhed/friskhed-badge.tsx` (`'use client'` hvis nødvendigt; ellers server) der viser ét niveau + besked konsistent (grøn/gul/rød-toner som eksisterende `text-yellow-600` mønster).
- Hver sektion (`/data`, `/dashboard`, `/indsatser`) henter sine indsigter (filtreret på `sektion`) og renderer dem inline — /data's eksisterende `StalenessStatus` erstattes/foldes ind i den nye badge for konsistens.

### 4.4 Dataflow
```
section page (server) → getDatafriskhed(kommuneId, new Date())
                       → henter rækker + beregnIndsigter()
                       → Indsigt[] filtreret på sektion
                       → <FriskhedBadge> inline
```

---

## 5. Scope

**I scope:** de 3 friskheds-signaler (emissionsdata NYT, indikator UDVID, kadence NYT) + den delte motor/query/badge + bonus delmål-tjek.

**Bevidst uden for scope:**
- Compliance-gating / "kan ikke godkendes"-domme.
- Sektor-ambitions-tjek → **Fase 5**.
- Reduktion↔tiltag-sammenhæng → **Fase 4**.
- Forbrugskategori- og fossil-tjek → skåret.
- Risikovurdering-friskhed → udskudt (Fase 7 data).
- Et konsolideret "recertificerings-overblik" / detaljeside → bevidst fravalgt (bruger valgte inline).
- Notifikationer pr. mail → infrastruktur-roadmap, senere.

---

## 6. Testning

- **Motor:** ren enhedstest pr. signal mod injiceret "nu" og kendte data (frisk/snart/forældet-grænser, manuel-kadence-undtagelse, manglende data → ingen falsk indsigt).
- **Query:** mock `@/db`, verificér at den rette data hentes og motoren kaldes.
- **Anti-falsk-positiv:** eksplicitte tests for at manglende/ufuldstændig data IKKE udløser en advarsel (troværdighed er alt — én forkert advarsel dræber featuren for en ikke-teknisk koordinator).

## 7. Succeskriterier

- [ ] Koordinatoren ser på /data en proaktiv friskheds-markering på regnskab + hver indikator (grøn/gul/rød) med hjælpende sprog.
- [ ] /dashboard viser en kadence-påmindelse når en opdatering nærmer sig/er forfalden (skjult ved `manuel`).
- [ ] Intet sted optræder ordene "fejl/ugyldigt/kan ikke godkendes".
- [ ] Manglende data giver aldrig en falsk advarsel.
- [ ] (Bonus) Et reduktionsmål uden delmål giver en venlig fremdrifts-indsigt på /indsatser.
