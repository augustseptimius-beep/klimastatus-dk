# Design: Konfigurerbart offentligt dashboard (widget-system) — Fase 1

**Dato:** 2026-06-03
**Status:** Godkendt til implementering (Fase 1)
**Omfang:** Widget-fundament + composer-UI + 4 kerne-widgets + standard-skabelon. Branding og resterende widgets udskydes til senere faser.

## Baggrund

Det offentlige dashboard (`/[slug]`) er et centralt selling point, men er i dag en
fast, statisk side med få visualiseringer og en bug i mål-beregningen. Kravet er nu:
**hver kommune skal selv kunne sammensætte sit dashboard af widgets**, via en nem UX,
så det passer til deres virkelighed. Inspiration fra Kausal Watch
(klimabarometer.holbaek.dk) — men ikke en 1:1-kopi.

Denne spec dækker **Fase 1**: selve widget-systemet (fundamentet) + de første fire
widgets. Når fundamentet står, er hver ny widget i Fase 2/3 blot ét nyt modul.

## Beslutninger truffet

- **Komposition-UX:** Tjekliste + træk-sortér + live preview. Widgets ligger i et
  **4-kolonners grid**; hver widget vælger bredde 1-4. Flyder og ombrydes; falder til
  fuld bredde på mobil.
- **Widget-config:** Smart standard + få valg pr. widget (1-3 felter, auto-genereret UI).
- **Branding:** Udskudt (logo/farver kommer i senere session).
- **Graf-bibliotek:** Recharts.
- **Rækkefølge:** Approach A — fundament + 4 kerne-widgets nu; resten inkrementelt.

## Arkitektur & lagring

### Lagring

Nyt JSONB-felt `public_widgets` på `kommune`: en **ordnet liste** af widget-instanser.

```ts
type WidgetInstans = {
  id: string;          // stabil uuid pr. instans (til React-keys + reorder)
  type: string;        // matcher en nøgle i widget-registeret
  width: 1 | 2 | 3 | 4;
  enabled: boolean;
  config: Record<string, unknown>; // widget-specifik, valideret mod definition
};
// kommune.public_widgets: WidgetInstans[]
```

Begrundelse: hele konfigurationen læses på én gang ved sidegengivelse; rækkefølge er
gratis (array-orden); nye widget-typer kræver ingen migration. JSONB frem for separat
tabel.

**Migration (drizzle):** Tilføj `public_widgets jsonb` (nullable, default tom liste).
De eksisterende felter `public_highlights` og `public_stale_days` bevares (bruges som
config-input til hhv. nøgletal- og tiltag-widgets), men er ikke længere kilden til
selve layoutet. Ingen breaking change på eksisterende kolonner.

### Render-flow

`app/(public)/[slug]/page.tsx`:
1. Hent kommune via `getKommuneBySubdomain(slug)`; `notFound()` hvis ikke `publicEnabled`.
2. Læs `public_widgets`; hvis tom → brug `STANDARD_SKABELON` (se nedenfor).
3. Filtrér til `enabled`-widgets i array-orden.
4. For hver widget: slå modulet op i registeret, kald `loadData(kommuneId, config)`
   parallelt (`Promise.all`).
5. Render hver widget i grid'et med dens `width`.

En widget hvis `type` ikke findes i registeret (fx fjernet senere) springes over uden
at vælte siden.

### Widget-register

`lib/widgets/registry.ts` mapper `type → modul`. Hvert modul (`lib/widgets/<type>/index.ts`)
eksporterer tre ting:

```ts
export const definition: WidgetDefinition;        // metadata til composer
export async function loadData(kommuneId, config): Promise<TData>;  // server-side
export function Component(props: WidgetProps<TData>): JSX.Element;   // ren visning
```

```ts
type WidgetDefinition = {
  type: string;
  navn: string;            // vist i composer
  beskrivelse: string;     // vist i composer
  ikon: string;            // lucide-react ikon-navn
  tilladteBredder: (1|2|3|4)[];
  standardBredde: 1|2|3|4;
  configFelter: ConfigFelt[];   // driver auto-genereret config-UI
};

type ConfigFelt =
  | { key: string; type: 'text';   label: string; standard: string }
  | { key: string; type: 'number'; label: string; standard: number; min?: number; max?: number }
  | { key: string; type: 'select'; label: string; standard: string; valg: {value: string; label: string}[] }
  | { key: string; type: 'multiselect'; label: string; standard: string[]; maxValg?: number;
      // 'kilde' lader feltet hente sine valgmuligheder dynamisk (fx kommunens indikatorer)
      kilde?: 'kommuneIndikatorer' };

type WidgetProps<TData> = { data: TData; config: Record<string, unknown>; width: 1|2|3|4 };
```

`configFelter` er nøglen til "smart standard + få valg": composeren genererer
config-UI automatisk ud fra definitionen — vi skriver ikke config-UI pr. widget.

## Composer-UX (admin)

Ny side `/indstillinger/dashboard` (link fra eksisterende indstillinger-side). To spalter:

**Venstre — byg:**
- Til/fra for hele den offentlige side (flytter den eksisterende `publicEnabled`-toggle hertil).
- Liste over widget-instanser, hver med: træk-håndtag (sortér), titel+ikon, bredde-vælger
  (segmenteret 1-4, kun `tilladteBredder`), auto-genererede config-felter, fjern-knap,
  enabled-toggle.
- "+ Tilføj widget" → panel med kataloget (navn + beskrivelse + ikon). Valg tilføjer en
  ny instans med `standardBredde` og config-standarder.
- Eksplicit "Gem"-knap (matcher eksisterende mønster; ingen auto-gem).

**Højre — preview:**
- `<iframe>` mod `/[slug]?preview=1`. Genindlæses ved gem. Iframe frem for parallel
  renderer, så preview altid er tro mod den rigtige side.

**Drag-sortering:** native HTML5 drag-and-drop (ingen tung dependency). Reorder opdaterer
array-rækkefølgen i klient-state; gem skriver hele arrayet.

**Server action:** `updateDashboardWidgets(widgets: WidgetInstans[])` — validerer at hver
`type` findes i registeret, at `width ∈ tilladteBredder`, og at `config` matcher
`configFelter` (ukendte nøgler fjernes, manglende får standard). Skriver `public_widgets`.

## Fase 1-widgets

Alle fire bygges som moduler under `lib/widgets/`.

### 1. `klimamaal-hero`
Forside-blok. Henter nyeste CO₂e (total) + baseline + det relevante reduktions-`maal`
(SMART, kategori `reduction`, med `maalAar`/`maalVaerdi`/`baselineVaerdi`/`baselineAar`).
Viser: kommunenavn + overskrift, nuværende CO₂e, **% reduceret siden baseline**,
progressbar mod målet, "år til mål" (= `maalAar - nuværende år`). **Fikser maalAar-buggen**
ved at bruge `maal.maalAar` i stedet for engagement-datoen.
- Bredder: [4]. Config: `overskrift` (text, standard "Klimastatus {år}").

### 2. `co2e-udvikling`
Linje-/arealgraf (Recharts) over CO₂e pr. år, med stiplet **målstreg mod 2030** og
baseline-reference. Config: `enhed` (select: total / per_capita, standard total),
`titel` (text). Bredder: [2,3,4], standard 4.

### 3. `noegletal`
Op til 5 udvalgte indikatorer med seneste værdi + pil/ændring ift. forrige år.
Config: `indikatorer` (multiselect, kilde `kommuneIndikatorer`, maxValg 5) — migreres
fra eksisterende `public_highlights`. Bredder: [2,3,4], standard 4.

### 4. `tekstblok`
Fri introtekst. Config: `overskrift` (text), `tekst` (textarea-variant af text).
Bredder: [2,3,4], standard 4. Ingen `loadData` (returnerer config direkte).

## Standard-skabelon

Konstant `STANDARD_SKABELON: WidgetInstans[]` brugt når `public_widgets` er tom:
`[klimamaal-hero (4), co2e-udvikling (4), noegletal (4)]`. Sikrer at en ny kommunes
side aldrig er tom — vigtigt for nem onboarding. Seed sætter dette for Grønkøbing.

## Grid-rendering

`app/(public)/[slug]/_components/widget-grid.tsx`: CSS Grid med
`grid-template-columns: repeat(4, 1fr)`; hver widget får `grid-column: span {width}`.
`@media (max-width: 768px)` → alle widgets `span 4`. Widgets der ikke fylder en hel
række efterlader tom plads til højre (ingen masonry — forudsigeligt og enkelt).

## Testning

- **Registry & validering** (vitest, ren logik): `updateDashboardWidgets`-validering —
  ukendt type afvises, ugyldig bredde korrigeres, ukendte config-nøgler fjernes,
  manglende får standard.
- **Widget `loadData`** (mocket `@/db`, matcher repo-mønster): hver widgets data-loader
  returnerer forventet form; håndterer "ingen data".
- **Rene beregninger:** % reduktion, år-til-mål, ændring-pr-år som rene funktioner med
  unit-tests.
- **Grid:** `width → grid-column span` mapping.
- Eksisterende `public-dashboard.test.ts` skal fortsat passere (queries genbruges).

## Bevidst udskudt

- Branding (logo/farver/font).
- Fase 2-widgets: sektoropdelt udledning, tiltag-overblik, indsatsområder, mål-progression.
- Fase 3-widgets: fremhævede tiltag, CCTF-certificering, seneste fremdrift, læringsfeed.
- Dokumenter/links-widget (downloadbare strategier, jf. Holbæk).
- Drill-down-sider pr. sektor.
- Auto-gem i composer.

## Risici

- **JSONB-config divergerer fra registeret** (fjernet widget-type, ændrede config-felter).
  Afbødet ved: render springer ukendte typer over; server action sanerer config mod
  definitionen ved hvert gem.
- **Recharts er en ny dependency** (bundle-størrelse). Acceptabelt; kun indlæst på det
  offentlige dashboard, ikke i admin.
- **iframe-preview + auth:** preview-ruten er den offentlige `/[slug]` (ingen auth nødvendig),
  så iframe virker uden session-komplikationer. `?preview=1` kan senere bruges til at vise
  endnu-ikke-gemte ændringer, men i Fase 1 viser previewet blot den gemte tilstand.
