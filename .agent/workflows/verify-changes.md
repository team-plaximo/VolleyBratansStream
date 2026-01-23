---
description: Verify changes after implementation - Browser test, Live-Code check, Logs
---

# /verify-changes Workflow

> **Nach JEDER Code-Änderung ausführen** um sicherzustellen, dass alles funktioniert.

---

## Phase 1: Lokale Verification

### 1.1 Docker-Status prüfen

// turbo
```powershell
cd c:\Users\brata\Documents\GitHub\VolleyBratansStream
docker compose ps
```

### 1.2 Browser-Test lokal

```
Browser-Subagent Task:

URL: http://localhost:5000 ODER file:///c:/Users/brata/Documents/GitHub/VolleyBratansStream/web/index.html

SCHRITTE:
1. Navigiere zur lokalen Seite
2. Hard-Reload (Ctrl+Shift+R)
3. DevTools Console öffnen
4. Prüfe auf JavaScript Errors (rote Meldungen)
5. Teste das geänderte Feature
6. Screenshot erstellen

RÜCKGABE:
- Console Errors (falls vorhanden)
- Feature funktioniert: ja/nein
- Screenshot
```

---

## Phase 2: Live-Site Verification (nach Deploy)

### 2.1 Cache-Busting prüfen

// turbo
```powershell
# Prüfe aktuelle Version in index.html
Select-String -Path "web\index.html" -Pattern "scout\.js\?v="
```

### 2.2 Server-Code vergleichen

// turbo
```powershell
# Prüfe ob Server den neuen Code hat
curl -s https://stream.volleybratans.com/scout.js | Select-String "[GEÄNDERTE_FUNKTION]"
```

### 2.3 Browser-Test online

```
Browser-Subagent Task:

URL: https://stream.volleybratans.com?nocache=[TIMESTAMP]

SCHRITTE:
1. Navigiere zur URL
2. Hard-Reload (Ctrl+Shift+R)
3. DevTools Console öffnen
4. Führe aus: console.log(window.scoutEngine?.addScore?.toString().substring(0,100))
5. Prüfe auf JavaScript Errors
6. Teste das Feature
7. Screenshot erstellen

RÜCKGABE:
- Code-Snippet (beweist neuer Code aktiv)
- Console Errors
- Feature-Status
- Screenshot
```

---

## Phase 3: ScoutEngine-spezifische Checks

### 3.1 Type-Safety prüfen

```javascript
// Im Browser ausführen:
console.log("Player ID Type:", typeof window.scoutEngine?.players?.[0]?.id)
// Soll: "number" ODER "string" - aber konsistent!
```

### 3.2 Event-Listener prüfen

```javascript
// Im Browser ausführen:
console.log("Listeners initialized:", window.scoutEngine?.tableListenersInitialized)
// Soll: true (nicht undefined)
```

### 3.3 Score-Funktionalität testen

1. Score-Button klicken → Console beobachten
2. Erwartung: +1 (nicht +2 wegen Double-Firing)
3. Position-Badge klicken → Cycled 1x (nicht 2x)

---

## Quick Smoke Test

// turbo
```powershell
# Lokale Endpunkte
curl -sf http://localhost:5000 > $null; echo "Local OK"

# Live-Site
curl -sf https://stream.volleybratans.com > $null; echo "Live OK"
```

---

## Checkliste

### Lokal
- [ ] Docker läuft
- [ ] Keine Console Errors
- [ ] Feature funktioniert

### Online (nach Deploy)
- [ ] Cache-Busting Version erhöht
- [ ] Server hat neuen Code (curl-Check)
- [ ] Hard-Reload durchgeführt
- [ ] Keine Console Errors
- [ ] Feature funktioniert
- [ ] Screenshot als Beweis

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| Änderung nicht sichtbar | Cache-Busting erhöhen in index.html |
| Score +2 statt +1 | Double-Firing Bug → Guard-Flag prüfen |
| Suche findet nichts | Type-Mismatch → `==` statt `===` |
| Feature funktioniert lokal, nicht online | Server-Code vergleichen → Deploy failed? |
