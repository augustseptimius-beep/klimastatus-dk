# Fase 1: Østerby Kommune Seed — Design

**Dato:** 2026-05-22
**Datakilde:** Herning Kommunes offentlige klimaplan (klimaplan.herning.dk)
**Mål:** Et deterministisk, idempotent seed-script der fylder systemet med realistiske demo-data

---

## Kommune-profil

| Felt | Værdi |
|------|-------|
| Navn | Østerby Kommune |
| Kommunekode | `0999` |
| Befolkningstal | 51.200 |
| Areal | 1.085 km² |
| Klimakommitment | 2021-06-01 |
| Primærfarve | `#1a5c38` |

**Baseline-emission (2018):** ~516.000 ton CO₂e total, ~10,1 ton CO₂e/indb.
(Skaleret fra Herning: 89.000 indb. × 12,7 t/indb. → 51.200 indb. × 10,1 t/indb. — reduceret lidt da Østerby har lidt mindre landbrugsandel)

**Klimamål:**
- 70% reduktion ift. 2018-niveau inden 2030
- Klimaneutralitet inden 2045

---

## Koordinator-bruger

| Felt | Værdi |
|------|-------|
| Email | `koordinator@oesterby.dk` |
| Navn | Maja Vestergaard |
| Rolle | koordinator |
| Password (demo) | `oesterby2026!` |

---

## Indsatsområder (5)

Inspireret af Hernings 7 indsatsområder, konsolideret til 5:

| # | Navn | Type | Sektor | Andel af emission |
|---|------|------|--------|-------------------|
| 1 | Vedvarende energi og udfasning af fossiler | `ghg_reduction` | `energy` | ~11% |
| 2 | Transport og mobilitet | `ghg_reduction` | `transport` | ~26% |
| 3 | Landbrug, natur og lavbundsarealer | `ghg_reduction` | `agriculture` | ~55% |
| 4 | Bygninger og bæredygtigt forbrug | `cross_cutting` | `buildings` | ~8% |
| 5 | Klimatilpasning | `adaptation` | `adaptation` | — |

---

## Tiltag (22 stk.)

### Indsats 1: Vedvarende energi og udfasning af fossiler (5 tiltag)
Baseret på Hernings solparker og vindmølleprojekter:

1. Etablering af solpark Nordmark (85 ha) — `in_progress`
2. Repowering af ældre vindmøller — `planned`
3. Udfasning af oliefyr i kommunale bygninger — `completed`
4. Fjernvarmeudvidelse til Østerby Vest — `in_progress`
5. Power-to-X partnerskab med lokalt energiselskab — `planned`

### Indsats 2: Transport og mobilitet (5 tiltag)
Baseret på Hernings grønne transport-indsatser:

6. El-busser på 3 kommunale ruter — `in_progress`
7. Pendlercykelstier (15 km ny infrastruktur) — `planned`
8. Kommunal køretøjsflåde 100% el inden 2027 — `in_progress`
9. Samkørselsprogram for virksomheder — `planned`
10. Ladestandere på kommunale p-pladser (40 stk.) — `completed`

### Indsats 3: Landbrug, natur og lavbundsarealer (5 tiltag)
Baseret på Hernings vådengsrestaurering og lavbundsprojekter:

11. Udtagning af lavbundsarealer (450 ha) — `in_progress`
12. Klimaskov — skovrejsning 120 ha — `planned`
13. Biogasfacilitet til husdyrgødning — `in_progress`
14. Frivillig omlægning til vedvarende vegetation — `planned`
15. Partnerskab med landboforening om klimavenlig drift — `in_progress`

### Indsats 4: Bygninger og bæredygtigt forbrug (4 tiltag)
16. Renoveringspulje til private boliger (5 mio. kr.) — `in_progress`
17. ESCO-renovering af 8 kommunale skoler — `completed`
18. Grønne indkøbskrav i kommunens udbud — `in_progress`
19. Vejledning til borgere om varmepumper — `planned`

### Indsats 5: Klimatilpasning (3 tiltag)
Baseret på Hernings vand-, tørke- og varmeindsatser:

20. Klimasikring af Østerby Å (oversvømmelse) — `in_progress`
21. Varmeplan for udsatte boligområder — `planned`
22. Skybrudsplan for bymidten — `in_progress`

---

## Tovholdere (5)

| Navn | Afdeling | Type | Indsats |
|------|----------|------|---------|
| Søren Kjeldgaard | Teknik & Miljø | intern | Vedvarende energi |
| Birgitte Møller | Vej & Park | intern | Transport |
| Hans Erik Christensen | Natur & Landbrug | intern | Landbrug & natur |
| Lene Stubkjær | Ejendomsservice | intern | Bygninger |
| Energi Østerby A/S | Forsyning | ekstern | Klimatilpasning |

---

## Mål (3)

1. **70% CO₂e-reduktion inden 2030** (SMART)
   - Baseline: 516.000 ton CO₂e (2018)
   - Mål: 154.800 ton CO₂e
   - Kategori: `reduction`

2. **Klimarobust infrastruktur inden 2035** (SMART)
   - Fokus: Reducér skadeomkostninger fra klimahændelser med 60%
   - Kategori: `adaptation`

3. **Retfærdig omstilling — ingen må lades tilbage** (Kvalitativt)
   - Kategori: `co_benefits`

---

## Indikatorer

### Automatiske (linket til `kommune_indikator` + eksisterende templates)
- Samlet CO₂e pr. capita (klimaregnskab, `kommunekode: 0999`)
- VE-kapacitet MW (energidataservice)
- Befolkningstal (DST)

### Manuelle (4 stk.)
- Andel fjernvarme (%) — outcome, mål: 95% inden 2030
- Antal el-biler i kommunen — output
- Lavbundsarealer udtaget (ha) — output, linket til tiltag 11
- Klimahændelser registreret (antal/år) — outcome

---

## Seed-arkitektur

```
db/seeds/oesterby.ts     — al Østerby-data
db/seed.ts               — kalder oesterby.ts seed (tilføjes)
```

`oesterby.ts` er idempotent:
- Tjekker om `kommune` med `kommunekode = '0999'` allerede eksisterer
- Hvis ja: springer over (ingen duplikater)
- Alle FK-relationer sættes op i rækkefølge: kommune → user → indsatsområder → tiltag → tovholdere → mål → indikatorer

---

## Succeskriterier

- [ ] `npx tsx db/seed.ts` kører uden fejl
- [ ] Kan køres 2x i træk uden fejl (idempotent)
- [ ] `koordinator@oesterby.dk` kan logge ind og se Østerby-dashboardet
- [ ] 5 indsatsområder og 22 tiltag vises
- [ ] Mindst 3 indikatorer vises med auto-hentningsknap
