# NEDLUKNING.md - klimastatus.dk

Beslutning truffet 2026-10-09: projektet videreføres ikke ("det bliver ikke til noget"). Repoet er mothballed, ikke slettet.

## Gjort i repoet

- `.github/workflows/deploy.yml`: `build-and-push` og `deploy` er slået fra (`if: ${{ false }}`). Typecheck, test og lint kører stadig på pull requests.
- `instrumentation-node.ts`: pg-boss-jobs (rykker, fetch-*, import-handlingskatalog) starter kun hvis `JOBS_ENABLED=true`.
- `README.md` og `AGENTS.md`: status og beslutning er opdateret.
- Kode, migrationer og seeds er uændrede. Licens er stadig AGPL-3.0.

## Tag klimastatus.dk offline og opsig server og domæne

Kan ikke gøres fra repoet. Rækkefølgen betyder noget, fordi databasen ligger på serveren og backupperne ligger hos Infomaniak.

**Bemærk:** `ARCHITECTURE.md` nævner Hetzner VPS + Coolify, mens serveren nu opsiges hos Infomaniak. Tjek hvilken udbyder der faktisk kører appen, så du ikke opsiger den forkerte (eller lader den anden køre og koste penge).

1. **Beslut om data skal bevares.** Databasen ligger i Docker-volumen `pgdata` på serveren (`docker-compose.prod.yml`) og forsvinder med serveren. Backups ligger i Infomaniak Swiss Backup (`docs/backup-runbook.md`), som er en separat tjeneste: opsiger du hele Infomaniak-kontoen, eller Swiss Backup-produktet, er de væk.
2. **Hvis data skal bevares:** kør `/opt/backup/backup.sh` på serveren og hent dumpen lokalt (`/opt/backup/dumps/` eller `rclone copy swissbackup:klimastatus/database/ ...`). Verificér filen (`gunzip -t` og `pg_restore`/`psql` mod en tom lokal Postgres). Runbooken er ikke afprøvet og har kendt drift (ROADMAP #2), så stol ikke blindt på den. Gem dumpen et sted uden for serveren og Infomaniak. Dumpen indeholder personoplysninger (brugere, tovholdere), så krypter den eller slet den, når den ikke skal bruges mere.
3. **Hvis data ikke skal bevares:** spring til 4, men overvej om kommunerne har krav på udlevering eller sletning.
4. **Giv eventuelle kommuner og brugere besked** og aftal en dato.
5. **Tag siden offline:** stop containerne på serveren (Coolify: Stop på applikationen, eller `docker compose -f docker-compose.prod.yml down` i mappen hvor den kører). Tjek bagefter at `https://klimastatus.dk/api/health` ikke svarer.
6. **Fjern baggrundsautomatik:** GitHub, Settings, Secrets and variables, Actions: slet variablen `DEPLOY_ENABLED` og secret `COOLIFY_TOKEN`. Slet cron-jobbet for backup på serveren (`crontab -l`), hvis serveren skal leve lidt længere.
7. **Tilbagekald nøgler:** Brevo, Anthropic, Klimaregnskabet.dk, Dataforsyningen, Coolify-token, rclone/Swiss Backup-password.
8. **Opsig serveren** hos udbyderen, når 1-3 er afklaret og siden er offline.
9. **Opsig eller lad domænet `klimastatus.dk` udløbe** til sidst. Fjern først DNS-poster, så ingen overtager subdomæner (`*.klimastatus.dk` er wildcard). Opsiger du det, kan andre registrere det, og mails til `noreply@`/`admin@klimastatus.dk` kan ende hos dem. Behold det i stedet et år uden hosting, hvis det er et problem.
10. **Arkivér repoet** på GitHub (Settings, Archive this repository), hvis du vil gøre det skrivebeskyttet. Pakken i GitHub Container Registry (`ghcr.io`) kan slettes under Packages.

## Genoplivning

Gendan de to `if`-betingelser i `deploy.yml` (de originale står i kommentarerne), sæt `JOBS_ENABLED=true` i miljøet, og følg `ARCHITECTURE.md` og `ROADMAP.md`. Lås ikke Next.js-versionen op uden at læse `node_modules/next/dist/docs/`, da de kendte breaking changes er dokumenteret der.
