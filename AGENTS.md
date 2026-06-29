# Projektbeslutninger

## Licens: AGPL-3.0

klimastatus.dk udgives under **AGPL-3.0** (GNU Affero General Public License v3.0).
Beslutning truffet 2026-05-29.

Konsekvenser:
- Forretningsmodellen er **open core / hosted SaaS** — vi sælger hosting, support, onboarding og data-integrationer, ikke koden selv. (Samme model som Kausal, GitLab, Sentry.)
- Vi må lovligt læse og genbruge kode fra Kausal-projekterne (kausal-watch, kausal-watch-ui, kausal-paths m.fl.), da de også er AGPL-3.0. AGPL→AGPL er foreneligt.
- Al egen kode der indgår i den netværkstilgængelige tjeneste skal forblive AGPL.
- Den reelle moat er drift, vedligehold, CCTF-ekspertise og data-integrationer — ikke kildekoden.
- En `LICENSE`-fil med AGPL-3.0-teksten skal tilføjes til repoet.

## Selvevaluering udfaset — CCTF bevares som rapporteringsrygrad

Beslutning truffet 2026-06-15.

CCTF-selvevalueringen — recertificeringsdokumentet, der genereres ~hvert 4. år — udgår som feature. Portalen peges mod sine tre primære søjler: **styring af handlinger, rapportering og indgang til relevant data.**

CCTF's 16 kriterier bevares som **det rammeværk kommunerne rapporterer ud fra**: mapping (`cctf_kriterie_mapping`), dækningsberegning (`getCctfDaekning`), dashboard-widget og admin-vedligehold af kriterier fortsætter uændret. Kun selve selvevaluerings-dokumentet og dets auto-generering er fjernet.

Begrundelse:
- Selvevalueringen bruges én gang hvert 4. år og bærer derfor svagt et løbende abonnement.
- Den lå tættest på konsulent-forretningen (recertificering som projektopgave).
- Den var den mest skrøbelige del at vedligeholde, hver gang CCTF skifter version.
- Ved at beholde CCTF som rammeværk bevares produktets differentiering, og salgsargumentet opgraderes fra "vi hjælper jer hvert 4. år" til "I er altid recertificerings-klar".

Konsekvens for roadmap: tidligere "Fase 3 — Selvevaluering" udgår. Fokus flytter til rapporterings-outputtet (Klimastatus-rapporten til kommunalbestyrelsen) — den tyndeste af de tre søjler i dag. `selvevaluering`-DB-tabellen står dormant (ingen destruktiv migration).

## Adresse-/geodata: DAWA er udfaset — brug ikke DAWA

Beslutning truffet 2026-06-29.

**DAWA (Danmarks Adressers Web API) er under udfasning.** BBR-data via DAWA er allerede lukket, og den officielle DAWA-dokumentation melder at tjenesten lukker. Coding-agenter (inkl. denne) griber pr. refleks efter DAWA, fordi gamle eksempler og Stack Overflow-svar lærer dem det. **Gør det ikke.** Når der bygges adresse-, matrikel-, BBR- eller geodata-funktionalitet, vælges kilde efter behov:

- **Brugervendt søgning / autocomplete / typeahead** → GSearch (SDFI/Dataforsyningens søge-API). GSearch er *ikke* Google Search og *ikke* en 1:1-erstatning for alle DAWA-endpoints.
- **Autoritative registerdata** → DAR / Datafordeler. Bevar DAR-UUID'er og strukturerede felter.
- **Access-address-id mod BBR/BFE-property-workflows** → `husnummer`.
- **Bygnings-footprints** → GeoDanmark Vektor GraphQL.
- **Replikering / historik / lokal kopi** → Datafordeler events/downloads/WFS/OGC.
- GSearch har **ikke** DAWA-style reverse geocoding eller datavask — lov ikke det modsatte.

Konkret for vores roadmap: BBR (`teknisk-arkitektur.md`, Fase 2b i `docs/superpowers/specs/2026-06-17-fase2-datahub-design.md`) skal hentes via Datafordeler — aldrig via DAWA. Verificér Datafordeler-adgang før commit.

Reference: `martincollignon/dawa_to_gsearch` (migrationsguide + service-chooser skrevet til agenter) og `martincollignon/gsearch-cli`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
