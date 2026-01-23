---
description: Environment Sync Check - Lokal vs. Produktion vergleichen vor kritischen Änderungen
---

# /environment-sync Workflow

> **Pre-Flight Check** für Environment Parity zwischen Lokal und Produktion.

---

## Wann ausführen?

- [ ] Vor größeren Feature-Releases
- [ ] Bei unerklärlichen Produktions-Bugs
- [ ] Nach längerer Pause (>1 Woche)
- [ ] Wenn mehrere Entwickler am Projekt arbeiten

---

## Quick Check (< 2 Min)

// turbo-all
```powershell
# 1. Lokalen Git-Status prüfen
cd c:\Users\brata\Documents\GitHub\VolleyBratansStream
git status --short
git log -1 --oneline

# 2. Server Git-Status prüfen
ssh root@46.224.233.14 "cd /root/VolleyBratansStream && git log -1 --oneline && git status --short"
```

> [!TIP]
> Passwort: `Volley2024!LiveStream`

---

## Erwartetes Ergebnis

| Check | ✅ OK | ❌ Problem |
|-------|------|-----------|
| Commit-Hash identisch | Beide zeigen gleichen Hash | Hashes unterschiedlich → `/deploy` ausführen |
| Keine uncommitted changes lokal | `nothing to commit` | Modified files → committen oder verwerfen |
| Keine uncommitted changes server | `nothing to commit` | Modified files → `git reset --hard` auf Server |

---

## Bei Abweichungen

### Lokal hat uncommitted Changes
```powershell
git add .
git commit -m "feat: [Beschreibung]"
git push
# Dann /deploy ausführen
```

### Server ist hinter Lokal
```powershell
ssh root@46.224.233.14 "cd /root/VolleyBratansStream && git pull && docker compose up -d --build"
```

### Server hat lokale Änderungen (GEFÄHRLICH!)
```bash
# Auf Server ausführen - ÜBERSCHREIBT SERVER-ÄNDERUNGEN!
cd /root/VolleyBratansStream
git reset --hard origin/master
docker compose up -d --build
```

---

## Docker Container Check

```powershell
ssh root@46.224.233.14 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

**Erwartete Container:**
- `volleybratans-relay` → Up (healthy)
- `volleybratans-web` → Up
- `volleybratans-caddy` → Up

---

## Lokale Docker-Entwicklung

Falls du produktionsnah lokal testen willst:

```powershell
cd c:\Users\brata\Documents\GitHub\VolleyBratansStream
docker compose -f docker-compose.dev.yml up
# Öffne http://localhost:3000
```

---

## Referenz-Dateien

| Datei | Zweck |
|-------|-------|
| `docker-compose.yml` | Produktions-Config |
| `docker-compose.dev.yml` | Lokale Entwicklung |
| `.env.example` | Template für Environment |
| `.env.production` | Produktions-Werte |
| `docs/pre-push-checklist.md` | Checkliste vor Push |
