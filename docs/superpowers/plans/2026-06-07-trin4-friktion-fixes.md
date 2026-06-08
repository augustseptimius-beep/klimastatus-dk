# Trin 4 — Friktion-fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fikse de 6 friktioner fra Thisted-pilotens driftsløkke-kørsel: fejldiagnose for klimadata, visuelt feedback ved datahentning, kobling af indikatorer til tiltag, tiltag-formular UX, nem adgang til offentligt dashboard, og ny indsatser-widget.

**Architecture:** Alle ændringer er additive eller retter eksisterende filer — ingen nye tabeller, ingen migrationer. F7 (klimadata) er primært UI-synliggørelse af eksisterende fejldata + brugertjek af Coolify-envvars. F2 (kobling) bruger de eksisterende `indikator_tiltag`-tabeller men mangler al UI. F4 (widget) følger det eksisterende 3-fils widget-mønster (definition + load + Component).

**Tech Stack:** Next.js App Router, React (useTransition, useOptimistic), Drizzle ORM, Tailwind/custom CSS, Vitest. Ingen nye dependencies.

---

## Filer der oprettes/modificeres

| Fil | Ændring |
|-----|---------|
| `app/(app)/k/[kommune]/data/page.tsx` | Inline fejlvisning, kobling-UI, konverter Hent-knap til client |
| `app/(app)/k/[kommune]/data/_hent-nu-knap.tsx` | **Ny** — klientkomponent med transition-states for "Hent nu" |
| `app/(app)/k/[kommune]/data/_kobling-panel.tsx` | **Ny** — klientkomponent til at tilknytte indikator til tiltag |
| `app/(app)/k/[kommune]/data/actions.ts` | Tilføj `tilknytIndikatorTiltagAction` + `fjernIndikatorTiltagAction` |
| `db/queries/indikator-kobling.ts` | **Ny** — getIndikatorKoblinger + getKoblingsMuligheder |
| `components/tiltag-form.tsx` | Tilføj tovholder-multiselect + årstal default til indeværende år |
| `app/(app)/k/[kommune]/tiltag/actions.ts` | Håndter tovholderIds i create + update |
| `app/(app)/k/[kommune]/tiltag/ny/page.tsx` | Load tovholdere og send til TiltagForm |
| `app/(app)/k/[kommune]/tiltag/[id]/rediger/page.tsx` | Load tovholdere + eksisterende koblinger til TiltagForm |
| `db/queries/tiltag.ts` | Tilføj `getTiltagTovholdere` + `setTiltagTovholdere` |
| `components/app-sidebar.tsx` | Tilføj "Offentligt dashboard" til secondaryNav |
| `lib/widgets/indsatser-oversigt/definition.ts` | **Ny** — widget-definition |
| `lib/widgets/indsatser-oversigt/load.ts` | **Ny** — data-loader |
| `lib/widgets/indsatser-oversigt/Component.tsx` | **Ny** — render-komponent |
| `lib/widgets/definitioner.ts` | Registrer ny widget |
| `lib/widgets/server-registry.ts` | Registrer ny widget |

---

## Task 1: F7 — Synliggør datahentningsfejl

**Problem:** Fejlbeskeder fra klimadata-hentning (f.eks. ugyldig API-nøgle, netværksfejl) er gemt i `kommuneIndikator.sidsteFejlBesked` men vises kun som en lille tooltip `⚠ Fejl`. Brugeren ser ikke hvad der gik galt.

**Diagnose-note (gøres INDEN kode):** Kør dette SQL mod produktions-DB for at se om der er fejlbeskeder:
```sql
SELECT visningsnavn, sidst_fejl, sidste_fejl_besked FROM kommune_indikator WHERE sidste_fejl IS NOT NULL;
```
Tjek også at `KLIMAREGNSKABET_API_KEY` er sat i Coolify (Settings → Environment Variables). Hvis den mangler, er det root cause for F7.

**Files:**
- Modify: `app/(app)/k/[kommune]/data/page.tsx:18-39` (StalenessStatus-komponent)

- [ ] **Step 1: Opdater StalenessStatus til at vise fejlbesked inline**

  I `app/(app)/k/[kommune]/data/page.tsx`, erstat `StalenessStatus`-funktionen (linje 18–39):

  ```tsx
  function StalenessStatus({ sidstHentet, sidsteFejl, sidsteFejlBesked }: {
    sidstHentet: Date | null;
    sidsteFejl: Date | null;
    sidsteFejlBesked: string | null;
  }) {
    if (sidsteFejl && (!sidstHentet || sidsteFejl > sidstHentet)) {
      return (
        <div>
          <span className="text-xs font-medium text-red-600">⚠ Fejl ved hentning</span>
          {sidsteFejlBesked && (
            <div className="mt-1 max-w-xs rounded bg-red-50 px-2 py-1 text-xs text-red-700 break-words">
              {sidsteFejlBesked}
            </div>
          )}
        </div>
      );
    }
    if (!sidstHentet) {
      return <span className="text-xs text-gray-400">Afventer første hentning</span>;
    }
    // eslint-disable-next-line react-hooks/purity
    const daysSince = Math.floor((Date.now() - new Date(sidstHentet).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 35) {
      return <span className="text-xs text-yellow-600">⚠ Senest hentet: {daysSince} dage siden</span>;
    }
    return <span className="text-xs text-green-600">Hentet {new Date(sidstHentet).toLocaleDateString('da-DK')}</span>;
  }
  ```

- [ ] **Step 2: Kør tests og typecheck**

  ```bash
  npm test -- --run
  npx tsc --noEmit
  ```
  Forventet: alle tests grønne, ingen type-fejl.

- [ ] **Step 3: Commit**

  ```bash
  git add app/\(app\)/k/\[kommune\]/data/page.tsx
  git commit -m "fix: vis datahentningsfejl inline i stedet for tooltip"
  ```

---

## Task 2: F5 — Visuelt feedback på "Hent nu"-knap

**Problem:** "Hent nu" er en `<form action={...}>` med ingen klientside-tilstand. Brugeren klikker og ingenting sker visuelt, fordi den faktiske hentning sker asynkront via pg-boss (og `revalidatePath` reloader siden, men data er endnu ikke hentet).

**Løsning:** Udpak knappen til en klientkomponent der viser "Sender..." while pending og "Job afsendt ✓" i 3 sekunder efter. Ærligt: vi signalerer at jobbet er *sat i kø*, ikke at data er *hentet*.

**Files:**
- Create: `app/(app)/k/[kommune]/data/_hent-nu-knap.tsx`
- Modify: `app/(app)/k/[kommune]/data/page.tsx` (importer + brug ny komponent)

- [ ] **Step 1: Opret `_hent-nu-knap.tsx`**

  ```tsx
  // app/(app)/k/[kommune]/data/_hent-nu-knap.tsx
  'use client';
  import { useState, useTransition } from 'react';
  import { hentNuAction } from './actions';

  export function HentNuKnap({ slug, kommuneIndikatorId }: { slug: string; kommuneIndikatorId: string }) {
    const [isPending, startTransition] = useTransition();
    const [afsendt, setAfsendt] = useState(false);

    function klik() {
      startTransition(async () => {
        const fd = new FormData();
        fd.append('fromYear', '');
        await hentNuAction(slug, kommuneIndikatorId, undefined, fd);
        setAfsendt(true);
        setTimeout(() => setAfsendt(false), 3000);
      });
    }

    return (
      <button
        type="button"
        onClick={klik}
        disabled={isPending || afsendt}
        className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
      >
        {isPending ? 'Sender…' : afsendt ? 'Job afsendt ✓' : 'Hent nu'}
      </button>
    );
  }
  ```

- [ ] **Step 2: Opdater data/page.tsx til at bruge HentNuKnap**

  Tilføj import øverst i `app/(app)/k/[kommune]/data/page.tsx`:
  ```tsx
  import { HentNuKnap } from './_hent-nu-knap';
  ```

  Erstat den eksisterende `<form action={hentNuFormAction...}>` blok (linje 157–163) med:
  ```tsx
  <HentNuKnap slug={slug} kommuneIndikatorId={ki.id} />
  ```

  Fjern importen af `hentNuFormAction` fra actions-importen (linje 7) da den ikke længere bruges direkte i page.tsx (men behold `hentNuAction` som fortsat bruges af `_hent-nu-knap.tsx`).

- [ ] **Step 3: Kør tests og typecheck**

  ```bash
  npm test -- --run
  npx tsc --noEmit
  ```
  Forventet: grønne.

- [ ] **Step 4: Commit**

  ```bash
  git add app/\(app\)/k/\[kommune\]/data/_hent-nu-knap.tsx app/\(app\)/k/\[kommune\]/data/page.tsx
  git commit -m "feat: visuelt feedback på Hent nu-knap (Sender → Job afsendt)"
  ```

---

## Task 3: F2 — Kobling af indikatorer til tiltag

**Problem:** `indikator_tiltag`-tabellen eksisterer men der er ingen UI til at oprette eller se koblinger. Datastyringssiden viser advarslen "3 indikatorer uden kobling" men giver ingen vej til at fikse det.

**Løsning:** Tilføj en queries-fil + server actions til at tilknytte/frakoble, og en klientkomponent der vises inline under hver ukoblet indikator.

**Files:**
- Create: `db/queries/indikator-kobling.ts`
- Create: `app/(app)/k/[kommune]/data/_kobling-panel.tsx`
- Modify: `app/(app)/k/[kommune]/data/actions.ts`
- Modify: `app/(app)/k/[kommune]/data/page.tsx`

- [ ] **Step 1: Opret `db/queries/indikator-kobling.ts`**

  ```ts
  // db/queries/indikator-kobling.ts
  import { db } from '@/db';
  import { indikatorTiltag, tiltag, indikatorMaal, maal } from '@/db/schema';
  import { eq, and } from 'drizzle-orm';

  export type IndikatorKobling = {
    tilknyttedeTiltag: { id: string; titel: string }[];
    tilknyttedeMaal: { id: string; titel: string }[];
  };

  export async function getIndikatorKobling(indikatorId: string): Promise<IndikatorKobling> {
    const tiltagRows = await db
      .select({ id: tiltag.id, titel: tiltag.titel })
      .from(indikatorTiltag)
      .innerJoin(tiltag, eq(indikatorTiltag.tiltagId, tiltag.id))
      .where(eq(indikatorTiltag.indikatorId, indikatorId));

    const maalRows = await db
      .select({ id: maal.id, titel: maal.titel })
      .from(indikatorMaal)
      .innerJoin(maal, eq(indikatorMaal.maalId, maal.id))
      .where(eq(indikatorMaal.indikatorId, indikatorId));

    return { tilknyttedeTiltag: tiltagRows, tilknyttedeMaal: maalRows };
  }

  export async function tilknytIndikatorTiltag(indikatorId: string, tiltagId: string): Promise<void> {
    await db.insert(indikatorTiltag).values({ indikatorId, tiltagId }).onConflictDoNothing();
  }

  export async function fjernIndikatorTiltag(indikatorId: string, tiltagId: string): Promise<void> {
    await db.delete(indikatorTiltag).where(
      and(eq(indikatorTiltag.indikatorId, indikatorId), eq(indikatorTiltag.tiltagId, tiltagId))
    );
  }
  ```

  Tjek at `maal` er eksporteret fra `@/db/schema`:
  ```bash
  grep -n "export.*maal" db/schema/index.ts 2>/dev/null || grep -rn "export const maal" db/schema/ | head -3
  ```
  Hvis `maal` ikke er i schema-indekset, tilpas importen til den korrekte sti.

- [ ] **Step 2: Tilføj server actions til `data/actions.ts`**

  Tilføj øverst i `app/(app)/k/[kommune]/data/actions.ts` (efter eksisterende imports):
  ```ts
  import { tilknytIndikatorTiltag, fjernIndikatorTiltag } from '@/db/queries/indikator-kobling';
  import { getKommuneIndikatorById } from '@/db/queries/kommune-indikator';
  import { getAllTiltag } from '@/db/queries';
  ```

  Tilføj disse to actions i bunden af filen:
  ```ts
  export async function tilknytIndikatorTiltagAction(
    slug: string,
    kommuneIndikatorId: string,
    tiltagId: string,
  ): Promise<void> {
    const { kommune } = await requireKommuneContext(slug);
    const ki = await getKommuneIndikatorById(kommuneIndikatorId);
    if (!ki || ki.kommuneId !== kommune.id) return;
    await tilknytIndikatorTiltag(ki.indikatorId, tiltagId);
    revalidatePath(`/k/${slug}/data`);
  }

  export async function fjernIndikatorTiltagAction(
    slug: string,
    kommuneIndikatorId: string,
    tiltagId: string,
  ): Promise<void> {
    const { kommune } = await requireKommuneContext(slug);
    const ki = await getKommuneIndikatorById(kommuneIndikatorId);
    if (!ki || ki.kommuneId !== kommune.id) return;
    await fjernIndikatorTiltag(ki.indikatorId, tiltagId);
    revalidatePath(`/k/${slug}/data`);
  }
  ```

- [ ] **Step 3: Opret `_kobling-panel.tsx`**

  ```tsx
  // app/(app)/k/[kommune]/data/_kobling-panel.tsx
  'use client';
  import { useState, useTransition } from 'react';
  import { tilknytIndikatorTiltagAction, fjernIndikatorTiltagAction } from './actions';

  type Tiltag = { id: string; titel: string };
  type Props = {
    slug: string;
    kommuneIndikatorId: string;
    tilknyttedeTiltag: Tiltag[];
    alleTiltag: Tiltag[];
  };

  export function KoblingPanel({ slug, kommuneIndikatorId, tilknyttedeTiltag, alleTiltag }: Props) {
    const [valgt, setValgt] = useState('');
    const [isPending, startTransition] = useTransition();

    const tilgaengelige = alleTiltag.filter((t) => !tilknyttedeTiltag.some((tt) => tt.id === t.id));

    function tilknyt() {
      if (!valgt) return;
      startTransition(() => tilknytIndikatorTiltagAction(slug, kommuneIndikatorId, valgt));
      setValgt('');
    }

    function fjern(tiltagId: string) {
      startTransition(() => fjernIndikatorTiltagAction(slug, kommuneIndikatorId, tiltagId));
    }

    return (
      <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs">
        <div className="mb-2 font-semibold text-blue-800">Koblinger</div>

        {tilknyttedeTiltag.length > 0 ? (
          <ul className="mb-2 space-y-1">
            {tilknyttedeTiltag.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="text-blue-900">↔ {t.titel}</span>
                <button
                  type="button"
                  onClick={() => fjern(t.id)}
                  disabled={isPending}
                  className="text-blue-400 hover:text-red-600"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-2 text-blue-600">Ingen koblinger endnu.</p>
        )}

        {tilgaengelige.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={valgt}
              onChange={(e) => setValgt(e.target.value)}
              className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs"
            >
              <option value="">Tilknyt til tiltag…</option>
              {tilgaengelige.map((t) => (
                <option key={t.id} value={t.id}>{t.titel}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={tilknyt}
              disabled={!valgt || isPending}
              className="rounded bg-blue-700 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              Tilknyt
            </button>
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 4: Integrer kobling-panel i data/page.tsx**

  I `app/(app)/k/[kommune]/data/page.tsx`:

  1. Tilføj imports:
  ```tsx
  import { getIndikatorKobling } from '@/db/queries/indikator-kobling';
  import { getAllTiltag } from '@/db/queries';
  import { KoblingPanel } from './_kobling-panel';
  ```

  2. I `DataPage`-funktionen, efter `aktiveWithValue` og `foraeldreloese` er hentet, tilføj:
  ```tsx
  const alleTiltag = await getAllTiltag(kommune.id);
  const koblinger = await Promise.all(
    aktiveWithValue.map(async (ki) => ({
      kommuneIndikatorId: ki.id,
      ...(await getIndikatorKobling(ki.indikatorId)),
    }))
  );
  ```

  3. I tabellens `<tbody>`, udvid `<td>` for hvert `ki` til at inkludere koblings-panel. Find den eksisterende Handlinger-kolonne (den med "Hent nu" + "Deaktiver") og tilføj en ekstra kolonne "Koblinger" til `<thead>` og `<tbody>`.

  Tilføj i `<thead>`:
  ```tsx
  <th className="px-4 py-3 font-medium">Koblinger</th>
  ```

  Tilføj i `<tbody>` for hvert `ki` (ny `<td>` efter Handlinger-td):
  ```tsx
  <td className="px-4 py-3 align-top" style={{ minWidth: 220 }}>
    {(() => {
      const kb = koblinger.find((k) => k.kommuneIndikatorId === ki.id);
      if (!kb) return null;
      return (
        <KoblingPanel
          slug={slug}
          kommuneIndikatorId={ki.id}
          tilknyttedeTiltag={kb.tilknyttedeTiltag}
          alleTiltag={alleTiltag}
        />
      );
    })()}
  </td>
  ```

- [ ] **Step 5: Kør tests og typecheck**

  ```bash
  npm test -- --run
  npx tsc --noEmit
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add db/queries/indikator-kobling.ts \
    app/\(app\)/k/\[kommune\]/data/_kobling-panel.tsx \
    app/\(app\)/k/\[kommune\]/data/actions.ts \
    app/\(app\)/k/\[kommune\]/data/page.tsx
  git commit -m "feat: kobl indikatorer til tiltag direkte fra datastyringssiden"
  ```

---

## Task 4: F1 — Tiltag-formular UX (årstal + tovholder)

**Problem:** (a) Tidsramme-dropdown starter ved 2015 men viser ingen default ved nyt tiltag — brugeren scroller fra toppen. (b) Ingen tovholder-felt — tovholdere knyttes via et separat flow, men ikke ved oprettelse/redigering af et tiltag.

**Løsning:** Default årstal til indeværende år. Tilføj tovholder-checkboxes til TiltagForm. Opdater actions til at synkronisere `tovholderTiltag`.

**Files:**
- Modify: `components/tiltag-form.tsx`
- Modify: `db/queries/tiltag.ts`
- Modify: `app/(app)/k/[kommune]/tiltag/actions.ts`
- Modify: `app/(app)/k/[kommune]/tiltag/ny/page.tsx`
- Modify: `app/(app)/k/[kommune]/tiltag/[id]/rediger/page.tsx`

- [ ] **Step 1: Tilføj `getTiltagTovholdere` og `setTiltagTovholdere` i `db/queries/tiltag.ts`**

  Tilføj i bunden af `db/queries/tiltag.ts`:
  ```ts
  import { tovholderTiltag } from '@/db/schema';
  import { inArray } from 'drizzle-orm';

  export async function getTiltagTovholdere(tiltagId: string): Promise<string[]> {
    const rows = await db
      .select({ tovholderId: tovholderTiltag.tovholderId })
      .from(tovholderTiltag)
      .where(eq(tovholderTiltag.tiltagId, tiltagId));
    return rows.map((r) => r.tovholderId);
  }

  export async function setTiltagTovholdere(tiltagId: string, tovholderIds: string[]): Promise<void> {
    await db.delete(tovholderTiltag).where(eq(tovholderTiltag.tiltagId, tiltagId));
    if (tovholderIds.length > 0) {
      await db.insert(tovholderTiltag).values(
        tovholderIds.map((tovholderId) => ({ tiltagId, tovholderId }))
      );
    }
  }
  ```

  Tjek at `tovholderTiltag` og `inArray` er importeret. `inArray` er fra `drizzle-orm` men bruges ikke her — fjern det hvis det kun er tilføjet automatisk. `tovholderTiltag` importeres fra `@/db/schema`.

- [ ] **Step 2: Opdater `components/tiltag-form.tsx`**

  Tilføj `TovholderOption`-type og `tovholdere`/`selectedTovholderIds` props:

  ```tsx
  type TovholderOption = { id: string; navn: string; forvaltning?: string | null };
  ```

  Skift `YEARS`-konstanten (linje 14) til:
  ```tsx
  const CURRENT_YEAR = new Date().getFullYear();
  const YEARS = Array.from({ length: CURRENT_YEAR - 2015 + 20 }, (_, i) => 2015 + i);
  ```

  Opdater `TiltagForm`-signaturen til:
  ```tsx
  export function TiltagForm({
    action, indsatser, defaultValues, tovholdere = [], selectedTovholderIds = [],
  }: {
    action: (state: FormState, formData: FormData) => Promise<FormState>;
    indsatser: IndsatsOption[];
    defaultValues?: DefaultValues;
    tovholdere?: TovholderOption[];
    selectedTovholderIds?: string[];
  })
  ```

  Opdater start-årstal i `parseDato` (bruges til `defaultValues`). Og for tomme `defaultValues` (nyt tiltag), sæt default start-år til indeværende år ved at ændre linjerne:
  ```tsx
  const startDato = parseDato(defaultValues?.tidsrammeStart);
  const slutDato = parseDato(defaultValues?.tidsrammeSlut);
  ```
  til:
  ```tsx
  const startDato = parseDato(defaultValues?.tidsrammeStart);
  const slutDato = parseDato(defaultValues?.tidsrammeSlut);
  const defaultStartAar = startDato.year || (defaultValues === undefined ? String(CURRENT_YEAR) : '');
  ```

  Sæt `defaultValue={defaultStartAar}` på start-årets select i stedet for `defaultValue={startDato.year}`.

  Tilføj tovholder-sektion i formularen, efter beskrivelse-feltet og før tidsramme-feltet:
  ```tsx
  {tovholdere.length > 0 && (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">Tovholdere</label>
      <div className="flex flex-col gap-2 rounded-md border border-gray-300 p-3">
        {tovholdere.map((tv) => (
          <label key={tv.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              name="tovholderIds"
              value={tv.id}
              defaultChecked={selectedTovholderIds.includes(tv.id)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span>{tv.navn}</span>
            {tv.forvaltning && <span className="text-xs text-gray-400">({tv.forvaltning})</span>}
          </label>
        ))}
      </div>
    </div>
  )}
  ```

- [ ] **Step 3: Opdater `tiltag/actions.ts` til at håndtere tovholderIds**

  Tilføj import øverst:
  ```ts
  import { setTiltagTovholdere } from '@/db/queries';
  ```

  I `createTiltagAction`, efter `await createTiltag(...)`, tilføj:
  ```ts
  const tovholderIds = formData.getAll('tovholderIds') as string[];
  const nytTiltag = await createTiltag({ ... }); // createTiltag skal returnere id
  if (tovholderIds.length > 0) {
    await setTiltagTovholdere(nytTiltag.id, tovholderIds);
  }
  ```

  **OBS:** `createTiltag` skal returnere den nye post. Tjek `db/queries/tiltag.ts`:
  ```bash
  grep -A8 "export async function createTiltag" db/queries/tiltag.ts
  ```
  Hvis den ikke returnerer noget, tilføj `.returning()` til insert-kaldet.

  I `updateTiltagAction`, efter `await updateTiltag(id, ...)`, tilføj:
  ```ts
  const tovholderIds = formData.getAll('tovholderIds') as string[];
  await setTiltagTovholdere(id, tovholderIds);
  ```

- [ ] **Step 4: Opdater `tiltag/ny/page.tsx` til at loade tovholdere**

  ```tsx
  import { getAllTovholdere } from '@/db/queries';

  // I NytTiltagPage, efter requireKommuneContext:
  const tovholdere = await getAllTovholdere(kommune.id);

  // Send til TiltagForm:
  <TiltagForm action={boundCreate} indsatser={indsatser} tovholdere={tovholdere} />
  ```

- [ ] **Step 5: Opdater `tiltag/[id]/rediger/page.tsx` til at loade tovholdere + existing**

  ```tsx
  import { getAllTovholdere, getTiltagTovholdere } from '@/db/queries';

  // I RedigerTiltagPage, efter requireKommuneContext:
  const [tovholdere, selectedTovholderIds] = await Promise.all([
    getAllTovholdere(kommune.id),
    getTiltagTovholdere(id),
  ]);

  // Send til TiltagForm:
  <TiltagForm
    action={boundUpdate}
    indsatser={indsatser}
    defaultValues={...}
    tovholdere={tovholdere}
    selectedTovholderIds={selectedTovholderIds}
  />
  ```

- [ ] **Step 6: Kør tests og typecheck**

  ```bash
  npm test -- --run
  npx tsc --noEmit
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add components/tiltag-form.tsx \
    db/queries/tiltag.ts \
    app/\(app\)/k/\[kommune\]/tiltag/actions.ts \
    app/\(app\)/k/\[kommune\]/tiltag/ny/page.tsx \
    app/\(app\)/k/\[kommune\]/tiltag/\[id\]/rediger/page.tsx
  git commit -m "feat: tiltagsformular — årstal default + tovholder-valg"
  ```

---

## Task 5: F6 — Nem adgang til offentligt dashboard

**Problem:** Dashboard-editoren er gemt under Indstillinger → Dashboard-opbygning. Det er 2+ klik og usynligt.

**Løsning:** Tilføj "Offentlig side" som fast punkt i sidebaren under sekundær navigation.

**Files:**
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Tilføj "Offentlig side" til secondaryNav**

  I `components/app-sidebar.tsx`, find `secondaryNav`-arrayet og tilføj et ekstra punkt:

  ```tsx
  const secondaryNav = [
    { href: `${base}/selvevaluering`, label: 'Selvevaluering' },
    { href: `${base}/indstillinger/dashboard`, label: 'Offentlig side' },
    { href: `${base}/indstillinger`,  label: 'Indstillinger' },
  ];
  ```

- [ ] **Step 2: Kør typecheck**

  ```bash
  npx tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add components/app-sidebar.tsx
  git commit -m "feat: tilføj Offentlig side som direkte sidebarlink"
  ```

---

## Task 6: F4 — Widget: Indsatsoversigt

**Problem:** Det offentlige dashboard har ingen widget der viser indsatsområder og handlinger. Det er den centrale klimaplan-data men den er usynlig for borgere.

**Løsning:** Ny widget `indsatser-oversigt` der viser indsatsområder med antal handlinger og status-breakdown. Følger det eksisterende 3-fils mønster.

**Files:**
- Create: `lib/widgets/indsatser-oversigt/definition.ts`
- Create: `lib/widgets/indsatser-oversigt/load.ts`
- Create: `lib/widgets/indsatser-oversigt/Component.tsx`
- Modify: `lib/widgets/definitioner.ts`
- Modify: `lib/widgets/server-registry.ts`

- [ ] **Step 1: Opret `definition.ts`**

  ```ts
  // lib/widgets/indsatser-oversigt/definition.ts
  import type { WidgetDefinition } from '../types';

  export const definition: WidgetDefinition = {
    type: 'indsatser-oversigt',
    navn: 'Indsatsoversigt',
    beskrivelse: 'Liste over klimaindsatsområder med handlinger og status.',
    ikon: 'ListChecks',
    tilladteBredder: [2, 3, 4],
    standardBredde: 4,
    configFelter: [],
  };
  ```

- [ ] **Step 2: Opret `load.ts`**

  ```ts
  // lib/widgets/indsatser-oversigt/load.ts
  import { db } from '@/db';
  import { indsatsOmraade, tiltag } from '@/db/schema';
  import { eq, sql } from 'drizzle-orm';

  export type IndsatsOversigt = {
    id: string;
    navn: string;
    type: string;
    antalTiltag: number;
    antalIgang: number;
    antalFaerdig: number;
  }[];

  export async function loadData(kommuneId: string): Promise<IndsatsOversigt> {
    const rows = await db
      .select({
        id: indsatsOmraade.id,
        navn: indsatsOmraade.navn,
        type: indsatsOmraade.type,
        antalTiltag: sql<number>`count(${tiltag.id})::int`,
        antalIgang: sql<number>`count(${tiltag.id}) filter (where ${tiltag.status} = 'in_progress')::int`,
        antalFaerdig: sql<number>`count(${tiltag.id}) filter (where ${tiltag.status} = 'completed')::int`,
      })
      .from(indsatsOmraade)
      .leftJoin(tiltag, eq(tiltag.indsatsOmraadeId, indsatsOmraade.id))
      .where(eq(indsatsOmraade.kommuneId, kommuneId))
      .groupBy(indsatsOmraade.id, indsatsOmraade.navn, indsatsOmraade.type)
      .orderBy(indsatsOmraade.navn);

    return rows;
  }
  ```

  Tjek at `indsatsOmraade` eksporteres fra `@/db/schema`:
  ```bash
  grep "indsatsOmraade" db/schema/index.ts | head -3
  ```

- [ ] **Step 3: Opret `Component.tsx`**

  ```tsx
  // lib/widgets/indsatser-oversigt/Component.tsx
  import type { WidgetProps } from '../types';
  import type { IndsatsOversigt } from './load';

  const TYPE_LABEL: Record<string, string> = {
    ghg_reduction: 'Drivhusgasreduktion',
    adaptation: 'Klimatilpasning',
    consumption: 'Forbrug',
    just_transition: 'Retfærdig omstilling',
    cross_cutting: 'Tværgående',
  };

  export function Component({ data }: WidgetProps<IndsatsOversigt>) {
    if (data.length === 0) return null;
    return (
      <section>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 16 }}>
          Klimaindsatser
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map((io) => (
            <div key={io.id} style={{ borderBottom: '1px solid #D9D2C2', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1A1A18' }}>{io.navn}</span>
                <span style={{ fontSize: 11, color: '#6B6B63', whiteSpace: 'nowrap' }}>
                  {TYPE_LABEL[io.type] ?? io.type}
                </span>
              </div>
              {io.antalTiltag > 0 && (
                <div style={{ marginTop: 4, fontSize: 12, color: '#6B6B63' }}>
                  {io.antalTiltag} {io.antalTiltag === 1 ? 'handling' : 'handlinger'}
                  {io.antalIgang > 0 && ` · ${io.antalIgang} igangværende`}
                  {io.antalFaerdig > 0 && ` · ${io.antalFaerdig} gennemført`}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }
  ```

- [ ] **Step 4: Registrer i `definitioner.ts`**

  ```ts
  // lib/widgets/definitioner.ts
  import { definition as indsatserOversigt } from './indsatser-oversigt/definition';

  export const DEFINITIONER: Record<string, WidgetDefinition> = {
    'klimamaal-hero': klimamaalHero,
    'co2e-udvikling': co2eUdvikling,
    noegletal,
    tekstblok,
    'indsatser-oversigt': indsatserOversigt,
  };
  ```

- [ ] **Step 5: Registrer i `server-registry.ts`**

  ```ts
  import { loadData as indsatserLoad, type IndsatsOversigt } from './indsatser-oversigt/load';
  import { Component as IndsatserComponent } from './indsatser-oversigt/Component';

  export const SERVER_REGISTRY: Record<string, ServerWidget> = {
    // ... eksisterende ...
    'indsatser-oversigt': {
      loadData: (id) => indsatserLoad(id),
      Component: IndsatserComponent as ComponentType<WidgetProps<never>>,
    },
  };

  export type { HeroData, Co2eUdviklingData, NoegletalData, IndsatsOversigt };
  ```

- [ ] **Step 6: Kør tests og typecheck**

  ```bash
  npm test -- --run
  npx tsc --noEmit
  ```
  Forventet: grønne.

- [ ] **Step 7: Commit**

  ```bash
  git add lib/widgets/indsatser-oversigt/ lib/widgets/definitioner.ts lib/widgets/server-registry.ts
  git commit -m "feat: ny indsatser-oversigt widget til offentligt dashboard"
  ```

---

## Task 7: Push og verifikation

- [ ] **Step 1: Kør fuld test-suite**

  ```bash
  npm test -- --run
  npx tsc --noEmit
  npm run lint
  ```
  Forventet: alle grønne. Fix eventuelle lint-fejl inden push.

- [ ] **Step 2: Push**

  ```bash
  git push
  ```
  Auto-deploy udløses via Coolify. CI-pipeline kører typecheck + tests + lint + Docker build.

- [ ] **Step 3: Verificer F7 i produktion**

  Gå til `klimastatus.dk/k/[slug]/data` og tjek om indikatorer viser fejlbesked inline. Hvis de viser en HTTP 403 eller "API key invalid"-fejl, mangler `KLIMAREGNSKABET_API_KEY` i Coolify Settings → Environment Variables. Sæt den til den korrekte nøgle og redeploy.

---

## Hvad der IKKE er i denne plan

- **F3 (fleksible KPI-typer):** Kræver DB-migrering (ny tabel eller JSONB-felt på tiltag) + formular-redesign. Parkeret til næste spec.
- **F8 (datahub med grafer):** Næste fase. Spec skrives separat.
