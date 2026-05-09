# klimastatus.dk - teknisk arkitektur

Dette er min bedste anbefaling til den tekniske arkitektur for klimastatus.dk. Den er optimeret for tre ting: dansk og europæisk dataselvstændighed, en solo-builder der koder igennem Claude Code, og hobbyvirksomheds-økonomi der skal kunne bære driften ved 10-30 kommuner.

Filosofien er brilliant basics. Ingen unikke valg, ingen eksperimentel teknologi. Alt der er valgt er konventionelt, veldokumenteret og noget Claude Code arbejder godt med.

## Tech stack

**Frontend og backend i samme codebase**: Next.js 15 med App Router. Det er den mest produktive ramme for en solo-builder lige nu, har stærk dokumentation, og Claude Code arbejder eksceptionelt godt med den. Server Components og Server Actions reducerer mængden af frontend/backend-kode markant. Alt kører på én Node-server.

**Sprog**: TypeScript end-to-end. Ingen runtime overraskelser, og typeinferens på tværs af frontend og backend gør udvikling med Claude Code væsentligt hurtigere.

**Database**: PostgreSQL 16 med pgvector-udvidelsen. Postgres er kedeligt, hvilket er det bedste argument for det. pgvector indlejrer vektorsøgning direkte i databasen, så vi slipper for en separat vector store til AI-konteksten.

**ORM**: Drizzle ORM. Lettere og mere transparent end Prisma, og generer type-safe SQL der er læseligt. Claude Code skriver Drizzle-queries mere pålideligt end den skriver Prisma-skemaer.

**UI**: Tailwind CSS plus shadcn/ui. Standardvalg i Next.js-økosystemet og hurtigt at arbejde med.

**Background jobs**: pg-boss. Det er en jobkø-implementering der bruger Postgres som backend i stedet for Redis. Færre afhængigheder, mindre infrastruktur at vedligeholde.

**Validation**: Zod. Bruges på tværs af API-input, formularer og parsing af eksterne API-svar.

## Hosting og infrastruktur

**Domæne**: klimastatus.dk er registreret hos One.com. DNS er endnu ikke sat op. Plan er at pege name servers til Cloudflare og derfra route til Hetzner-serveren.

**VPS-leverandør**: Hetzner Cloud (Falkenstein, Tyskland). Valgt frem for Curanet/Cirrushost for at komme hurtigere i gang - Hetzner er mere udviklerorienteret og billigere. EU og GDPR-compliant. Et setup med 2-4 GB RAM løber op i 100-250 kr./md. Managed Postgres kan tilføjes via Hetzner Managed Databases eller køres som container.

Curanet er stadig det rigtige valg hvis en kunde specifikt kræver dansk dataplacering.

**Containerisering**: Docker Compose. Ikke Kubernetes, ikke Nomad, ikke noget med distribuerede systemer. Monolitisk Next.js-container plus en Postgres-container plus en Caddy-container til reverse proxy og automatisk HTTPS. Hele setup'et er 30-40 linjer YAML.

**Deployment**: GitHub Actions der bygger Docker-image, pusher til GitHub Container Registry, og SSHer til VPS'en for at trække og restarte. Det er primitivt sammenlignet med Vercel, men det giver fuld kontrol over hvor data ligger og koster ingenting ekstra.

**Backup**: Daglig pg_dump til Backblaze B2 med europæiske datacentre, plus en ugentlig kopi til en separat dansk lokation. Backup-strategien er to-vejs: katastrofe-recovery og GDPR (slettede data skal kunne dokumenteres som slettet).

**Object storage**: Til kommunens logoer, skabeloner og uploadede billeder bruges Backblaze B2 EU eller Hetzner Object Storage. Begge er S3-kompatible.

**Email**: Brevo (tidligere Sendinblue). Fransk, EU-hostet, har gratis tier op til omkring 300 emails/dag hvilket dækker MVP. Til transaktionelle emails som tovholder-magic-links og notifikationer.

**Error monitoring**: Sentry. Tysk firma, EU-hosting tilgængelig. Gratis tier dækker hobbyvirksomhed-skala.

**DNS og certifikater**: Cloudflare for DNS (gratis, hurtig) - name servers skal peges fra One.com til Cloudflare. Caddy håndterer Let's Encrypt-certifikater automatisk på serveren.

## AI-arkitektur

Det er det område hvor sovereignty-kravene kræver mest omtanke.

**Model**: Mistral Large 2 eller Mistral Small 3 via Mistral AI's europæiske platform (la Plateforme). Mistral er fransk, hoster i EU, og har eksplicit positioneret sig på europæisk dataselvstændighed. Modellerne er open weight, hvilket betyder vi kan migrere til selv-hosting senere uden at omskrive promptlaget.

For tekstgenerering til Klimastatus-rapporter er Mistral Small 3 typisk tilstrækkelig og koster en brøkdel af de store modeller. Mistral Large 2 reserveres til opgaver der kræver mere ræsonnement, fx generering af perspektiveringer på tværs af indsatsområder.

**Hvis fuld kontrol kræves**: Self-host Mistral 7B eller Llama 3.3 70B på en GPU-VPS hos Hetzner eller Scaleway. Det kræver mere setup og koster mere ved lavt volumen, men giver fuld dataselvstændighed. Pragmatisk anbefaling: start på Mistrals EU-platform, og migrer til self-hosted hvis enkeltkunder kræver det eller volumen retfærdiggør det.

**Inferens-orkestrering**: Vercel AI SDK eller direkte fetch-kald til Mistrals API. Vercel AI SDK er produktivt, men låser ikke noget ind, og virker fint mod Mistral. Streaming-output til UI gennem Server-Sent Events.

**Prompting-arkitektur**: Tre-lags struktur for tekstgenerering. Første lag er en system-prompt der definerer kommunens politiske sprog og tone (uploades af kommunen ved onboarding som eksempler fra tidligere Klimastatus). Andet lag er en kontekstprompt der trækker relevante datapunkter fra databasen for det aktuelle indsatsområde. Tredje lag er den faktiske opgave (skriv afsnit X, opsummer fremdrift på Y, foreslå formulering om Z). Promptene gemmes som versionerede templates i databasen, ikke i koden.

**Vector search til kontekst**: pgvector i Postgres. Embeddings genereres med Mistrals embed-API. Vi indekserer tovholdernes statusinput, eksisterende rapportafsnit og data-noter, så AI'en kan finde relevant kontekst på tværs.

**Hallucinations-håndtering**: Aldrig auto-publicering. Klimakoordinatoren godkender altid før noget skrives ind i en rapport. AI'ens output er udkast, og UI'et fremhæver visuelt at det er AI-genereret indtil det er manuelt godkendt.

## Authentication

To brugerflows med vidt forskellige krav.

**Klimakoordinator-login**: Almindeligt email plus password. Lucia Auth eller Auth.js (NextAuth). Argon2id-hashing. Sessioner i database, ikke JWT. Magic links som backup hvis password-flow er for tungt for brugen.

**Tovholder-flow**: Ingen account, ingen login. Tovholderen modtager en email med et magic link der indeholder et signeret token. Token er gyldigt for hele rapporteringsperioden, fx 30 dage, og udsteder en cookie der lader dem komme tilbage til samme formular. Token er bundet til specifik tovholder og specifikke indsatsområder. En klikket-rate over 80% er kun realistisk hvis flowet er fuldstændig friktionsløst, og det betyder ingen login.

**Sikkerhed**: Tokens genereres med crypto.randomBytes (32 bytes), gemmes som SHA-256-hash i databasen, har eksplicit udløbsdato, er one-time-use til at oprette session, og kan tilbagekaldes. Audit log på alle token-events.

## Integration med eksterne datakilder

Det største tekniske risikoområde i hele platformen er afhængigheden af eksterne API'er der ikke har formel SLA.

**Mønster**: Alle eksterne API-kald sker via background jobs i pg-boss, ikke synkront fra UI. Resultater caches i en `external_data_cache`-tabel med timestamp. Hvis et API er nede, viser UI'et det sidst kendte data plus en advarsel om alderen. Ingen brugerflow der blokerer på en synkron API-kald.

**Refresh-frekvens** pr. kilde:
- Klimaregnskabet.dk: månedligt poll (de opdaterer årligt, men polling sikrer detection)
- Energidataservice: dagligt
- BBR: ugentligt
- Danmarks Statistik: månedligt
- DMI Klimaatlas, KAMP, HIP: versions-detection (de udgiver versioner, ikke streaming data)

**Fejlhåndtering**: Tre forsøg med eksponentiel backoff. Efter tre fejl logges hændelsen i Sentry og vises i admin-dashboardet. Stale data markeres tydeligt i UI'et med dato for sidste vellykkede hentning.

**Versionshåndtering af kilder**: Når DMI Klimaatlas eller KAMP udgiver ny version, markeres alle berørte indikatorer for genvurdering automatisk og klimakoordinatoren får en notifikation. Dette er en specifik regel i CCTF kriterie 5 om at vidensgrundlaget skal være retvisende.

## PDF-generation

**Pipeline**: Klimastatus-rapporten genereres som HTML med Tailwind, derefter konverteres til PDF med Puppeteer der kører i en separat Docker-container. Vi genererer ikke Word-filer.

**Kommunens skabelon**: Ved onboarding uploader kommunen sin grafiske skabelon i form af et PDF-eksempel og en sæt billeder med logo og brand-elementer. AI'en hjælper klimakoordinatoren med at oversætte skabelonen til en HTML-template med Tailwind-styling. Template gemmes pr. kommune i databasen og kan opdateres.

**Skrifttyper og farver**: Custom fonts uploades og selvhostes. Farver gemmes som CSS-variabler i kommunens template.

**Eksport-pipeline**: Når klimakoordinatoren klikker "eksporter", genereres HTML server-side med alle tovholderdata og indikatorer indlejret, sendes til Puppeteer-containeren, og PDF returneres. Kan tage 5-15 sekunder for længere rapporter.

## CCTF-versionering

CCTF-vejledningen er allerede ved version 1.0, og en v2 kommer med erfaringer fra første certificeringsrunde.

**Strategi**: Hver selvevaluering gemmes med eksplicit reference til den CCTF-version den blev genereret under. Kriterie-definitioner ligger som versionerede records i databasen, ikke i koden. Når v2 udgives, oprettes nye kriterie-definitioner uden at slette de gamle, og platformen tilbyder kommunen at migrere deres dokumentation til v2 med en assisteret diff-visning.

**Skema-evolution**: Migrationsscripts via Drizzle Kit. Aldrig destruktive ændringer uden migrations-test mod produktionssnapshot.

## Audit log

**Implementering**: Append-only `events`-tabel med kolonner for `user_id`, `entity_type`, `entity_id`, `action`, `before_state` (JSONB), `after_state` (JSONB), `timestamp`, `ip_address`. Skrives via en wrapper omkring alle database-skriveoperationer.

**Visning**: Klimakoordinatoren kan se historik på ethvert dokument og se hvem der ændrede hvad hvornår. Det er en undervurderet feature i salgsdialogen, fordi politisk forankrede dokumenter har behov for sporbarhed.

## GDPR og dataselvstændighed

**Persondata-omfang**: Platformen behandler tovholderens navn, email og forvaltningstilknytning, plus klimakoordinatorens login-credentials. Ingen borgerdata, ingen følsomme kategorier. Det her er den vigtigste afklaring fra et juridisk synspunkt: vi er ikke i nærheden af særlige kategorier af persondata.

**Databehandleraftale**: Standard databehandleraftale skrives op før første kunde. Skabelon fra Datatilsynet eller en kommunal indkøbsorganisation. Skal være på plads ved onboarding.

**Sletteflow**: Ved kunde-opsigelse eksporteres alt deres data til en zip-fil og slettes 30 dage efter. Sletning logges i audit log.

**Datalokation-erklæring**: Skriv en eksplicit dokumentside der viser hvor data ligger (Hetzner, tysk datacenter, EU), hvor backup ligger, og hvilke tredjeparter der har adgang (Mistral for AI-kald, Brevo for emails, Sentry for fejlrapporter). Alle disse er EU-baserede.

**Mistral og GDPR**: Mistrals la Plateforme har EU-Data Privacy Framework og standard GDPR-databehandleraftaler. AI-input logges ikke ifølge deres betingelser, men dette skal verificeres og dokumenteres pr. kunde.

## Udvikling og operations

**Repo-struktur**: Mono-repo med tydelig opdeling i `app/` (Next.js), `db/` (Drizzle skemaer og migrations), `jobs/` (pg-boss workers), `prompts/` (AI prompt templates som kode), `scripts/` (admin og data-import).

**Test-strategi**: Vitest til unit-tests af forretningslogik, Playwright til en håndfuld kritiske end-to-end-tests (login, tovholder-flow, eksport). Eksterne API-kald mockes i tests, og en separat suite kører mod live API'er ugentligt for at fange ændringer i deres datastrukturer.

**Observability**: Pino til strukturerede logs, Sentry til exceptions, og en simpel admin-side der viser status på alle background jobs og eksterne API-integrationer.

**Claude Code-venlighed**: README med klare entry-points, konsistent navngivning, og kommentarer der forklarer hvorfor (ikke hvad). Alle filer holdes under 300 linjer hvor muligt. Database-schema og prompts er de to mest vigtige steder at have ekstra kommentarer, fordi det er der hvor forretningslogikken faktisk bor.

## Hvad jeg ikke anbefaler

**Vercel eller andre amerikanske hostere**: Selv om de er væsentligt mere udviklingsvenlige, modarbejder de selvstændighedsforslaget. Sværdet med at skulle forklare en kommune at deres data ligger på AWS Frankfurt er ikke værd at trække.

**OpenAI eller Anthropic API til kunde-rettede AI-features**: Begge er amerikanske og selv om de har EU-deployment-options, er det en svagere position end at sige "fransk model på fransk serverpark". Anthropic er fint til selve udviklingsarbejdet (Claude Code), bare ikke til runtime AI-features kommunen interagerer med.

**Mikroservices**: Skala retfærdiggør det aldrig. Monolit hele vejen.

**GraphQL**: Tilfører kompleksitet uden at løse et reelt problem ved denne skala. Server Actions og REST-endpoints er rigeligt.

**Auth-as-a-service (Clerk, Auth0, Supabase Auth)**: Lock-in og dataselvstændigheds-problemer. Lucia eller Auth.js er rigeligt og holder data lokalt.

**Stripe**: Amerikansk og en abonnementsmodel på 5.000 kr./md. retfærdiggør ikke kompleksiteten. Manuel fakturering via Dinero eller e-conomic er tilstrækkeligt indtil 25+ kunder.

## Sammenfatning

Stack: Next.js, TypeScript, Postgres med pgvector, Drizzle, pg-boss, Tailwind, shadcn/ui.

Hosting: Hetzner Cloud VPS (Falkenstein, EU), Docker Compose, Caddy, GitHub Actions deployment. Domæne registreret hos One.com, DNS flyttes til Cloudflare.

AI: Mistral Large 2 og Small 3 via la Plateforme (EU), prompt templates versioneret i database, vector search via pgvector.

Eksterne tjenester: Brevo (email, EU), Sentry (errors, EU), Backblaze B2 EU (storage og backup).

Forventet månedlig driftsomkostning ved MVP: 400-700 kr.
Forventet månedlig driftsomkostning ved 25 kunder: 1.500-2.500 kr.

Hele stacken er konventionel, EU-baseret, og noget Claude Code arbejder produktivt med. Det er den simple version, og det er bevidst.
