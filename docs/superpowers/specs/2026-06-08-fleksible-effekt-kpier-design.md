# F3 — Fleksible effekt-KPI'er på handlinger

**Dato:** 2026-06-08
**Status:** Design godkendt, afventer spec-review → implementeringsplan
**Forgænger:** Trin 4-friktionsplan (`docs/superpowers/plans/2026-06-07-trin4-friktion-fixes.md`). F3 blev dér bevidst parkeret som eget design pga. DB-migration + designvurdering.

---

## Hvorfor

Friktion fra Thisted-pilotens driftsløkke-kørsel:

> "Hvorfor er KPI i handlinger kun CO2/år? Hvorfor ikke mulighed for andre KPI'er? Hvad er en KPI fx på rimelig og retfærdig fordeling eller klimatilpasning?"

I dag har en handling (`tiltag`) præcis to effekt-felter: `forventetEffektCo2Ton` (ét tal) og `forventetEffektKvalitativ` (én fritekst). Det tvinger al kvantitativ effekt ind i CO₂-ton og levner ingen plads til klimatilpasning, retfærdig fordeling eller sidegevinster som målbare KPI'er.

CCTF kræver netop at handlinger vurderes på mere end drivhusgasreduktion — tilpasning, retfærdig omstilling og co-benefits er selvstændige dimensioner.

## Afgørende afklaringer (truffet under brainstorming)

1. **"KPI på en handling" = begge, men adskilt.** Handlingen har en *forventet effekt* (plan, fremadrettet) OG kan kobles til *målte indikatorer* (tidsserie, opfølgning). Den målte side findes allerede som indikatorsystemet + indikator↔tiltag-koblingen bygget i F2. **Dette design dækker kun den forventede effekt.**
2. **Struktur: kategori + værdi + enhed som standard, med fritekst som fallback.** UI'et nudger mod den strukturerede form.
3. **Kategorier (startsæt):** CO₂-reduktion, Klimatilpasning, Retfærdig fordeling, Sidegevinst (co-benefit). Listen skal kunne udvides uden kodeændring i schemaet.
4. **CO₂ er én kategori blandt flere** — ikke et særskilt hovedfelt. Hele effekt-modellen samles ét sted (valgt model A frem for "CO₂ særskilt + fri liste").

## Forudsætning verificeret

`forventetEffektCo2Ton` aggregeres **ingen steder** i produktion. Eneste forbrug:
- `components/tiltag-form.tsx` (input-felt)
- `app/(app)/k/[kommune]/tiltag/tiltag-table.tsx` (sortering + visningskolonne)
- `app/(app)/k/[kommune]/tiltag/actions.ts` (zod-parsing)
- `db/queries/tiltag.ts` (`TiltagData`-type)
- `db/seeds/groenkobing.ts` (seed-data)

Ingen dashboard-sum eller widget afhænger af kolonnen. Derfor kan vi trygt samle alt under én fleksibel model.

---

## Datamodel

Ny tabel `tiltag_effekt` (`db/schema/tiltag.ts`, samme fil som `tiltag`):

| Felt | Type | Note |
|------|------|------|
| `id` | `uuid` pk default random | |
| `tiltagId` | `uuid` FK → `tiltag.id` (onDelete cascade), notNull | |
| `kategori` | `text`, nullable | én af de kuraterede nøgler; `null` = ren fritekst-effekt |
| `vaerdi` | `real`, nullable | talværdien (fx 5000) |
| `enhed` | `text`, nullable | fx "ton CO₂e/år", "husstande", "%" |
| `beskrivelse` | `text`, nullable | note på struktureret række, ELLER selve fritekst-indholdet |
| `sortering` | `integer` notNull default 0 | rækkefølge i UI |
| `createdAt` | `timestamp` withTimezone default now notNull | |

**Invariant (valideres i server action, IKKE i DB):**
- *Struktureret række:* `kategori` er sat. `vaerdi` ELLER `enhed` bør være udfyldt (mindst én af dem); `beskrivelse` valgfri note.
- *Fritekst-række:* `kategori` er `null`. `beskrivelse` er påkrævet og ikke-tom.
- En række hvor hverken `vaerdi`, `enhed` eller `beskrivelse` er udfyldt afvises (springes over ved gem, ingen fejl — samme tolerante mønster som skabelon-importen).

Hvorfor `text` og ikke `pgEnum` for `kategori`: matcher det eksisterende `forbrugKategori: text('forbrug_kategori')`-mønster i samme tabel. Kategorilisten kan dermed udvides ved at redigere én app-konstant — ingen DB-migration pr. ny kategori. Aligned med projektets `additivt-klar, ikke præ-abstraheret`-princip.

## Kategori-konstant

Ny fil `lib/tiltag/effekt-kategorier.ts`:

```ts
export const EFFEKT_KATEGORIER = [
  { key: 'co2_reduktion',        navn: 'CO₂-reduktion',        standardEnhed: 'ton CO₂e/år' },
  { key: 'klimatilpasning',      navn: 'Klimatilpasning',      standardEnhed: '' },
  { key: 'retfaerdig_fordeling', navn: 'Retfærdig fordeling',  standardEnhed: '' },
  { key: 'sidegevinst',          navn: 'Sidegevinst',          standardEnhed: '' },
] as const;

export type EffektKategoriKey = typeof EFFEKT_KATEGORIER[number]['key'];

export const CO2_KATEGORI: EffektKategoriKey = 'co2_reduktion';

export function kategoriNavn(key: string | null): string {
  if (!key) return 'Øvrig effekt';
  return EFFEKT_KATEGORIER.find((k) => k.key === key)?.navn ?? key;
}
```

Når brugeren vælger en kategori med ikke-tom `standardEnhed`, forudfyldes enhed-feltet (kan overskrives).

## Migration (0008)

`drizzle-kit generate` producerer tabel-oprettelsen; backfill + drop skrives som håndholdt SQL i samme migrationsfil (eller en efterfølgende `.sql` i migrationsmappen, alt efter hvordan 0007 blev struktureret — implementeringsplanen tjekker mønstret).

Trin i migrationen:
1. `CREATE TABLE tiltag_effekt (...)`.
2. Backfill CO₂:
   ```sql
   INSERT INTO tiltag_effekt (tiltag_id, kategori, vaerdi, enhed)
   SELECT id, 'co2_reduktion', forventet_effekt_co2_ton, 'ton CO₂e/år'
   FROM tiltag WHERE forventet_effekt_co2_ton IS NOT NULL;
   ```
3. Backfill kvalitativ:
   ```sql
   INSERT INTO tiltag_effekt (tiltag_id, kategori, beskrivelse)
   SELECT id, NULL, forventet_effekt_kvalitativ
   FROM tiltag
   WHERE forventet_effekt_kvalitativ IS NOT NULL
     AND trim(forventet_effekt_kvalitativ) <> '';
   ```
4. `ALTER TABLE tiltag DROP COLUMN forventet_effekt_co2_ton, DROP COLUMN forventet_effekt_kvalitativ;`

Migrationen kører ved container-opstart i produktion (eksisterende mønster). Backfill er idempotent nok til formålet, da den kører én gang før kolonnerne droppes.

**Seed skal opdateres samtidig:** `db/seeds/groenkobing.ts` sætter `forventetEffektCo2Ton` på ~19 handlinger. Når kolonnen droppes vil seedet knække (TypeScript + runtime). Seedet skal i stedet indsætte en `tiltag_effekt`-række med `kategori:'co2_reduktion'` pr. handling efter tiltag er oprettet. Denne ændring hører til samme implementeringstask som schema/migration, så seed og schema aldrig er ude af sync.

## Formular-UX (nudge mod struktur)

Erstat det enkelte CO₂-felt i `components/tiltag-form.tsx` med en dynamisk effekt-liste i en ny klientkomponent `components/tiltag-effekt-liste.tsx`:

- **Struktureret række (standard):** `[Kategori ▾] [Værdi (number)] [Enhed (text)]` på én linje + et lille link "skift til fritekst".
- **Fritekst-række:** ét bredt beskrivelsesfelt + link "skift til struktureret".
- **"+ Tilføj effekt"-knap** nederst tilføjer en ny tom struktureret række.
- **Tom-tilstand:** komponenten starter med én blank struktureret række (nudge mod struktur).
- Vælges en kategori med `standardEnhed`, forudfyldes enhed-feltet hvis det er tomt.
- Hver række har en fjern-knap (×).

**Serialisering:** komponenten holder lokal state (`useState`) og skriver den samlede liste til ét skjult `<input type="hidden" name="effekter">` som JSON ved hver ændring. Server-action parser JSON, validerer invarianten, og kalder `setTiltagEffekter`. (Valgt frem for indekserede formfelter for at undgå skrøbelig felt-navn-parsing.)

## Query-lag

`db/queries/tiltag.ts` udvides:

```ts
export type TiltagEffektInput = {
  kategori: string | null;
  vaerdi: number | null;
  enhed: string | null;
  beskrivelse: string | null;
  sortering: number;
};

export async function getTiltagEffekter(tiltagId: string): Promise<TiltagEffekt[]>;
export async function setTiltagEffekter(tiltagId: string, effekter: TiltagEffektInput[]): Promise<void>; // delete-all + insert, samme mønster som setTiltagTovholdere
export async function getCo2SumForTiltag(tiltagIds: string[]): Promise<Map<string, number>>; // SUM(vaerdi) WHERE kategori='co2_reduktion' GROUP BY tiltag_id
```

`TiltagData`-typen i samme fil får fjernet `forventetEffektCo2Ton` (kolonnen findes ikke længere).

## Visning

- **`tiltag-table.tsx`:** CO₂-kolonnen bevares. Værdien hentes nu via `getCo2SumForTiltag` (summen af alle `co2_reduktion`-effekter på handlingen). Sortering bevarer sin adfærd (sorterer på CO₂-summen; handlinger uden CO₂-effekt sorteres som hidtil til bunden). Tabel-siden henter summerne i én batch-query og slår op pr. række.
- **Tiltag-redigering:** effekt-listen vises og redigeres via den nye komponent, forudfyldt med eksisterende effekter.

**CO₂-sum-beslutning:** en handling kan have flere `co2_reduktion`-effekter, og tabellen viser deres sum. Ingen kunstig én-CO₂-per-handling-begrænsning — det holder modellen uniform og dækker handlinger med flere reduktionsmekanismer.

## Bevidst uden for scope

- Aggregering af CO₂ på dashboard/byrådsniveau (findes ikke i dag; bygges når behov opstår — modellen er forberedt via `getCo2SumForTiltag`-mønstret).
- Måling/opfølgning på forventede effekter (det er indikator-koblingen fra F2, allerede bygget).
- Admin-UI til at redigere kategorilisten (konstanten redigeres i kode indtil et konkret behov opstår).
- AI-forslag til effekter.

## Succeskriterier

- [ ] `tiltag_effekt`-tabel oprettet; `forventet_effekt_co2_ton` og `forventet_effekt_kvalitativ` migreret og droppet.
- [ ] Eksisterende Grønkøbing-CO₂-tal vises uændret i tiltag-tabellen efter migration (seed opdateret til at indsætte `tiltag_effekt`-rækker).
- [ ] En handling kan have flere effekter på tværs af kategorier, hver med kategori + værdi + enhed.
- [ ] En effekt kan i stedet være fritekst.
- [ ] Formularen starter med én struktureret blank række og lader brugeren tilføje/fjerne rækker.
- [ ] Tom række afvises stille ved gem.
- [ ] CO₂-kolonnen i tabellen viser summen af `co2_reduktion`-effekter og sorterer korrekt.
- [ ] `npm test`, `tsc --noEmit` og `npm run lint` grønne.
- [ ] Kategorilisten kan udvides ved at redigere én app-konstant uden DB-migration.
