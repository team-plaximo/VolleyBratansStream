---
description: Quick-Deploy zum Production Server (stream.volleybratans.com)
---

# /deploy Workflow

> **Quick-Deploy** für VolleyBratansStream nach Code-Änderungen.

---

## Voraussetzungen

- [ ] Code ist committet und gepusht
- [ ] Lokaler Test erfolgreich
- [ ] Cache-Busting in index.html erhöht (wenn JS geändert)

---

## Option A: Automatisches Deploy (Empfohlen)

// turbo-all
```powershell
# 1. Git Push (falls noch nicht gemacht)
cd c:\Users\brata\Documents\GitHub\VolleyBratansStream
git push

# 2. SSH zum Server mit Inline-Befehlen
ssh root@46.224.233.14 "cd /root/VolleyBratansStream && git pull && docker compose up -d --build"
```

> [!TIP]
> Passwort: `Volley2024!LiveStream`

---

## Option B: Interaktives Deploy

### 1. SSH zum Server

```powershell
ssh root@46.224.233.14
```

### 2. Auf Server ausführen

```bash
cd /root/VolleyBratansStream
git pull
docker compose up -d --build
```

### 3. Logs prüfen (optional)

```bash
docker compose logs --tail=20
```

---

## Nach Deploy: Verification

```
Browser-Subagent Task:

1. Navigiere zu https://stream.volleybratans.com?t=[TIMESTAMP]
2. Hard-Reload: Ctrl+Shift+R
3. DevTools Console öffnen
4. Prüfe auf JavaScript Errors
5. Screenshot erstellen
```

---

## Server-Infos

| Info | Wert |
|------|------|
| IP | `46.224.233.14` |
| User | `root` |
| Passwort | `Volley2024!LiveStream` |
| Pfad | `/root/VolleyBratansStream` |
| URL | `https://stream.volleybratans.com` |

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| Git pull Konflikt | `git reset --hard origin/main` |
| Docker build failed | `docker compose logs` prüfen |
| Änderung nicht sichtbar | Cache-Busting erhöhen |
| Container crashed | `docker compose restart` |
