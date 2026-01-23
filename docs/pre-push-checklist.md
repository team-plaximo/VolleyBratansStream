# Pre-Push Checklist ✅

Vor jedem `git push` diese Schritte durchführen:

## 1. Lokaler Test

- [ ] **Frontend läuft:** `python -m http.server 8088` im `web/` Ordner
- [ ] **Browser öffnen:** `http://localhost:8088`
- [ ] **DevTools Console (F12):** Keine JavaScript-Fehler
- [ ] **Module testen:** Scout, Scoreboard, Matchday, Coach View

## 2. Cache-Busting (bei JS-Änderungen)

Wenn JavaScript-Dateien geändert wurden:

```html
<!-- In index.html: Version erhöhen -->
<script src="app.js?v=2.1"></script>
```

## 3. Git Commit

```powershell
cd c:\Users\brata\Documents\GitHub\VolleyBratansStream
git status                    # Änderungen prüfen
git add .                     # Alles stagen
git commit -m "feat: ..."     # Commit mit Message
git push                      # Push zu GitHub
```

## 4. Deploy zu Produktion

```powershell
# Option A: One-Liner
ssh root@46.224.233.14 "cd /root/VolleyBratansStream && git pull && docker compose up -d --build"

# Option B: /deploy Workflow nutzen
```

> **Passwort:** `Volley2024!LiveStream`

## 5. Verification (nach Deploy)

- [ ] **Browser:** `https://stream.volleybratans.com?t=[timestamp]`
- [ ] **Hard Reload:** `Ctrl+Shift+R`
- [ ] **Console prüfen:** Keine Fehler
- [ ] **Health Check:** `curl https://stream.volleybratans.com/health`

---

## Quick Reference

| Umgebung | URL | Port |
|----------|-----|------|
| Lokal (Dev) | `http://localhost:8088` | 8088 |
| Lokal (Docker) | `http://localhost:3000` | 3000 |
| Produktion | `https://stream.volleybratans.com` | 443 |
