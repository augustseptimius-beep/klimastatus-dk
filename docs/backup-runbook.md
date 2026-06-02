# Backup Runbook — klimastatus.dk

## Oversigt

Databasen backes dagligt op til **Infomaniak Swiss Backup** via rclone (OpenStack Swift).

| Parameter | Værdi |
|---|---|
| Backup-tjeneste | Infomaniak Swiss Backup BK-1714627-1 |
| Endpoint | swiss-backup04.infomaniak.com |
| Container | `swissbackup:klimastatus/database/` |
| Kørsel | Dagligt kl. 02:00 UTC (automatisk via cron) |
| Lokale kopier | De 7 seneste dumps beholdes på serveren under `/opt/backup/dumps/` |
| Log | `/opt/backup/backup.log` |

---

## Manuelt køre en backup nu

Log ind på serveren via Coolify Terminal (localhost) og kør:

```bash
/opt/backup/backup.sh
```

---

## Tjek backup-status

```bash
# Se seneste log-linjer
tail -20 /opt/backup/backup.log

# List lokale dumps
ls -lh /opt/backup/dumps/

# List backups hos Swiss Backup
rclone ls swissbackup:klimastatus/database/
```

---

## Gendanne databasen fra backup

### 1. Find den ønskede backup

```bash
rclone ls swissbackup:klimastatus/database/
```

Output ser f.eks. sådan ud:
```
12345678 database/db_20260602_132226.sql.gz
```

### 2. Download backup-filen

```bash
rclone copy swissbackup:klimastatus/database/db_20260602_132226.sql.gz /tmp/
```

### 3. Gendan til databasen

> ⚠️ Dette overskriver al eksisterende data i databasen. Stop gerne appen først.

```bash
# Stop Next.js-appen midlertidigt (valgfrit men anbefalet)
docker stop ku89p74dfsc9n3nmgklr6ox3-112954453636

# Gendan
gunzip -c /tmp/db_20260602_132226.sql.gz | \
  docker exec -i q10hu13lemzcdfx5ly3wr828 psql -U postgres postgres

# Start appen igen
docker start ku89p74dfsc9n3nmgklr6ox3-112954453636
```

> Eller brug "Redeploy" i Coolify i stedet for at starte containeren manuelt.

---

## Tekniske detaljer (til fejlfinding)

**Backup-script:** `/opt/backup/backup.sh`  
**rclone config:** `/root/.config/rclone/rclone.conf`  
**PostgreSQL-container:** `q10hu13lemzcdfx5ly3wr828` (postgres:18-alpine)  
**DB-navn:** `postgres`, **DB-bruger:** `postgres`

**Swiss Backup credentials (opbevares i rclone.conf på serveren):**
- User: `SBI-AS048925`
- Tenant: `sb_project_SBI-AS048925`
- Endpoint: `https://swiss-backup04.infomaniak.com/identity/v3`

Passwordet genereres og fornyes via:  
Infomaniak Manager → Cloud Computing → Swiss Backup → BK-1714627-1 → Cloud storage → Klimastatus.dk → Generate new password
