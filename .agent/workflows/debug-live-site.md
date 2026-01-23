---
description: Live-Site Debugging - Local vs Online Code-Diskrepanzen finden und beheben
---

# /debug-live-site Workflow

> **Für:** Features funktionieren lokal, aber nicht auf `https://stream.volleybratans.com`

---

## Phase 1: Hypothese bilden (NICHT raten!)

### 1.1 Was genau funktioniert nicht?

Dokumentiere EXAKT:
- Welches Feature?
- Was passiert lokal?
- Was passiert online?
- Gibt es Console-Fehler?

### 1.2 Code auf Server vs. Lokal vergleichen

// turbo
```powershell
# Prüfe ob der Server den aktuellen Code hat
curl -s https://stream.volleybratans.com/scout.js | Select-String "kritischeFunktion"

# Vergleich mit lokalem Code
Get-Content web\scout.js | Select-String "kritischeFunktion"
```

> [!TIP]
> Wenn der Code unterschiedlich ist → Cache-Busting-Problem!
> Prüfe `index.html` auf `?v=X` Parameter.

---

## Phase 2: Browser-Debugging (KRITISCH!)

### 2.1 Browser-Subagent Template

```
Du debuggst die Live-Site https://stream.volleybratans.com:

KONTEXT:
- Feature: [FEATURE_NAME]
- Problem: [PROBLEM_BESCHREIBUNG]

SCHRITTE:
1. Navigiere zu https://stream.volleybratans.com
2. Öffne DevTools (F12)
3. Gehe zum Console Tab
4. Führe aus:
   - console.log(window.scoutEngine?.addScore?.toString())
   - console.log(typeof window.scoutEngine?.players?.[0]?.id)
5. Prüfe auf Errors (rote Meldungen)
6. Teste das Feature manuell
7. Screenshot erstellen

RÜCKGABE:
1. Console Output (Code-Strings)
2. Alle Errors mit Stacktrace
3. Screenshot
4. Deine Diagnose
```

### 2.2 Bekannte Bug-Patterns prüfen

| Pattern | Symptom | Diagnose-Befehl |
|---------|---------|-----------------|
| Type-Mismatch | Suche findet nichts | `typeof variable` |
| Double-Firing | +2 statt +1 | Event-Listener zählen |
| Stale Cache | Alter Code läuft | `method.toString()` vergleichen |

---

## Phase 3: Fix implementieren

### 3.1 Type-Mismatch Fix

```javascript
// VORHER (Bug)
const player = players.find(p => p.id === playerId);

// NACHHER (Fix)
const player = players.find(p => p.id == playerId);
```

### 3.2 Double-Firing Fix

```javascript
// Guard-Flag hinzufügen
if (this.listenersInitialized) return;
this.listenersInitialized = true;
```

### 3.3 Alle Stellen finden

// turbo
```powershell
# Finde alle betroffenen Stellen
Select-String -Path "web\scout.js" -Pattern "p\.id === playerId" | ForEach-Object { $_.LineNumber }
```

### 3.4 Cache-Busting erhöhen

```powershell
# In web/index.html: Version erhöhen
# ?v=2 → ?v=3
```

---

## Phase 4: Lokal testen

### 4.1 Browser-Subagent lokal

```
Teste die lokale Version:

URL: file:///c:/Users/brata/Documents/GitHub/VolleyBratansStream/web/index.html
ODER: http://localhost:5000

SCHRITTE:
1. Navigiere zur lokalen Seite
2. Teste [FEATURE]
3. Prüfe Console auf Errors
4. Bestätige: Score +1 (nicht +2), Position cyclet 1x (nicht 2x)
```

> [!CAUTION]
> **NIEMALS deployen ohne lokalen Test!**

---

## Phase 5: Deployment

// turbo-all
```powershell
# Git Commit
cd c:\Users\brata\Documents\GitHub\VolleyBratansStream
git add web/scout.js web/index.html
git commit -m "fix: [BUG_BESCHREIBUNG]"
git push
```

### SSH zum Server

```powershell
ssh root@46.224.233.14
# Passwort: Volley2024!LiveStream
```

### Auf Server ausführen:

```bash
cd /root/VolleyBratansStream
git pull
docker compose up -d --build
```

---

## Phase 6: Online-Verifizierung

### 6.1 Browser-Subagent final

```
Verifiziere den Fix auf der Live-Site:

URL: https://stream.volleybratans.com?nocache=[TIMESTAMP]

SCHRITTE:
1. Hard-Reload (Ctrl+Shift+R)
2. DevTools Console öffnen
3. Prüfe: window.scoutEngine?.addScore?.toString() zeigt neuen Code
4. Teste [FEATURE]
5. Bestätige: Funktioniert wie erwartet
6. Screenshot als Beweis
```

---

## Checkliste

- [ ] Hypothese dokumentiert (nicht geraten)
- [ ] Server-Code mit lokalem Code verglichen
- [ ] Browser-Debugging mit Console-Inspektion
- [ ] Root-Cause identifiziert
- [ ] Fix implementiert
- [ ] Cache-Busting erhöht
- [ ] Lokal getestet
- [ ] Deployed
- [ ] Online verifiziert mit Hard-Reload
