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

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
