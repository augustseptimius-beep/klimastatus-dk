# klimastatus.dk

## Hvad det er

Et softwareværktøj til klimakoordinatorer i danske kommuner. Platformen indsamler status fra tovholdere, trækker offentlige data ind automatisk, og genererer både Klimastatus-rapporten til kommunalbestyrelsen og selvevalueringsskemaet til CCTF-recertificering.

Målet er at en klimakoordinator skal kunne lave næste års Klimastatus på en uge frem for to måneder.

## Hvem det er for

Klimakoordinatoren i kommunen er den primære bruger og beslutningstager. Det er den person der i dag jonglerer Excel-ark, sender rykkere til tovholdere, skriver lange politikrapporter om aftenen, og bagefter står med selvevalueringsskemaet på toppen.

Sekundære brugere er tovholdere på indsatsområder rundt om i kommunens forvaltning samt teamleder og chef der godkender materialet.

## Problemet

Klimakoordinatorer i kommuner bruger 4-8 ugers fuldtidsarbejde årligt på at indsamle status, skrive Klimastatus, og holde selvevalueringen levende. Det meste af tiden går til administration, koordinering og formatering.

CCTF stiller krav om monitorering, offentlig rapportering, og dokumentation af opfyldelse af 16 kriterier. Hvert krav løses i dag manuelt, ofte med konsulenthjælp i 50.000-300.000 kr.-klassen pr. opgave.

CONCITOs nationale monitoreringssystem skaber endnu en rapporteringsforpligtelse for kommunen uden at lette deres egen interne proces.

## Positionering

CONCITO bygger et nationalt overbliksværktøj til Klimaalliancen. Det er et top-down system der trækker spørgeskemadata fra alle kommuner og udgiver én årlig statusrapport for hele landet.

klimastatus.dk er bottom-up. Det løser den enkelte kommunes interne workflow og leverer som biprodukt de data CONCITO efterspørger. Forholdet svarer til hvordan kommercielle ESG-platforme (Position Green, Sweep) forholder sig til EFRAG's VSME-skabelon. Myndighederne sætter rammen. Kommercielle produkter løser det daglige arbejde.

## Sådan hænger funktionerne sammen

Hele platformen er bygget omkring CCTF's 16 kriterier som datamodel. Hver indtastning, hver indikator og hvert datapunkt er knyttet til det kriterie det dokumenterer. Det er den kobling der gør selvevalueringen halv-automatisk og som adskiller platformen fra et generisk projektledelsesværktøj.

### Tovholder-input

Hver tovholder modtager et unikt link til en mobilvenlig formular med deres specifikke indsatsområder. De udfylder status, barrierer, og fremdrift i strukturerede felter. Ingen login, ingen Excel-rundsending.

Det fodrer både tekstgenereringen og selvevalueringen, og det giver klimakoordinatoren et live overblik over hvilke tovholdere der mangler at svare.

### Automatisk dataindhentning

Systemet trækker løbende data fra Klimaregnskabet.dk, Energidataservice, BBR og Danmarks Statistik på de indikatorer der går igen i alle kommuners Klimastatus: CO₂-regnskab, varmepumpeudrulning, elbil-udvikling, vedvarende energi, fjernvarmedækning.

Det erstatter den manuelle dataindsamling der i dag tager dage hvert år, og det sikrer at CO₂-regnskabet aldrig er ældre end CCTF's 3-årsgrænse.

### Auto-generering af selvevalueringsskema

Når tovholderdata og offentlige data er på plads, kan systemet auto-udfylde store dele af CCTF-selvevalueringen. For hvert af de 16 kriterier vises hvilke datapunkter der dokumenterer opfyldelsen, og hvor der er huller. Klimakoordinatoren godkender og redigerer, men starter aldrig fra et tomt dokument.

Det er den feature der mest direkte rammer smerten ved at "selvevaluering er tidskrævende og ikke værdiskabende".

### Auto-generering af Klimastatus-tekst

AI-laget genererer udkast til Klimastatus-rapporten i kommunens politiske sprog, baseret på tovholdernes input og data-laget. Den røde tråd skabes ved at AI'en kender hele datasættet på tværs af indsatsområder og kan referere internt.

Klimakoordinatoren redigerer udkastet. Forskellen er at vedkommende sidder med 80% færdigt materiale frem for at skrive fra bunden.

### PDF-eksport i kommunens layout

Ved onboarding uploader kunden sin grafiske skabelon. Systemet eksporterer Klimastatus som færdig PDF klar til politisk behandling. Samme datasæt eksporteres også i CONCITOs spørgeskemaformat så kommunen ikke skal udfylde data dobbelt.

### Senere udvidelser

Peer benchmarking når der er nok kunder. Klimakoordinatoren kan se hvordan deres kommune ligger på centrale indikatorer sammenlignet med kommuner af tilsvarende størrelse og struktur. Stærkt politisk argument internt.

Offentlig live-side genereret automatisk fra samme datasæt opfylder CCTF-kriterie 16 om offentligt tilgængelig dataplatform.

## Hvad succes ser ud som

### Platform samlet

18 måneder: 10-15 betalende kommuner, 360-540.000 kr. ARR, retention over 90% efter første bindingsperiode.

3 år: 25-35 kommuner, 900.000-1.260.000 kr. ARR. Det er den realistiske øvre ende uden at gå efter de 4-5 store kommuner med interne udviklingsmiljøer.

Loft: omkring 2-3 mio. kr. ARR ved fuld penetration af Klimaalliancen. Hobbyvirksomhed-skala, ikke venture-spor.

### Per feature

**Tovholder-input.** 80% af tovholderne svarer uden at klimakoordinatoren skal rykke. Tidsforbrug på indsamling: fra 3 uger til 3 dage.

**Dataindhentning.** Alle relevante indikatorer er højst en måned gamle på alle tidspunkter. Klimakoordinatoren henter ikke længere data manuelt.

**Selvevalueringsskema.** 70% af felterne er auto-udfyldt og til godkendelse. Tidsforbrug: fra 2 uger til 2 dage.

**Tekstgenerering.** 60% af teksten kan accepteres som den er, 30% kræver redigering, 10% skrives fra bunden. Tidsforbrug på skrivearbejde: fra 4 uger til 1 uge.

**PDF-eksport.** Ét klik. Layoutet matcher kommunens skabelon uden manuel typografi.

## Forretningsmodel

3.000-5.000 kr./md., et års bindingsperiode. Under udbudsgrænsen og uden persondata, så ingen IT-udbud og ingen databehandleraftale.

Onboarding under 2 timer. Ingen separate konsulentdage. Self-service support gennem dokumentation og let chat.

Køberen er klimakoordinator eller teamleder. Budgetposten ligger typisk under en konsulentbudgetlinje, ikke en software-budgetlinje. Salgsargumentet er "tre uger sparet om året", ikke "endnu et IT-system".

## Roadmap

**MVP (måned 1-4)**: tovholder-input, datalag på 3-4 kerneindikatorer, selvevaluering, basis tekstgenerering, PDF-eksport. 1-2 betalende pilotkunder.

**V2 (måned 5-9)**: flere datakilder, bedre tekstgenerering, ekstern aktør-input til kriterie 3 og 4, CONCITO-spørgeskema-eksport. 5-8 kunder.

**V3 (måned 10-15)**: peer benchmarking, offentlig dashboard, udvidet klimatilpasnings-modul. 10-15 kunder.

**V4 (måned 15+)**: integration med kommunens GIS/ESDH-systemer. Eventuelt tilpasning til norske og svenske rammer hvis dansk marked er mættet.

## Risici at holde øje med

CONCITO udvider monitoreringssystemet til kommune-specifikke output. Sandsynligt over 2-3 års sigt. Mitigerende: det er en supplerende relation, ikke en konkurrence, og kommunens egen workflow er ikke deres prioritet.

CCTF flytter sig (v3, v4). Loft for vedligeholdelsesbyrde, ikke eksistensiel risiko.

Krav om databehandleraftale hvis tovholderdata kategoriseres som persondata. Skal afklares juridisk inden launch.

Salgscyklen i kommuner er langsommere end ARR-fremskrivningen forudsætter. Buffer realistisk 6 måneder ekstra på alle planer.
