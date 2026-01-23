# VolleyBratans Stream Platform - Agent Handoff Document

## Übersicht
Die **VolleyBratans Stream Platform** ist eine Web-Anwendung zur Live-Statistik-Erfassung und Stream-Steuerung für Volleyball-Spiele.

**URL Production**: https://stream.volleybratans.com
**Repository**: c:\Users\brata\Documents\GitHub\VolleyBratansStream

---

## Architektur

```
VolleyBratansStream/
├── web/                    # Frontend (Static HTML/CSS/JS)
│   ├── index.html          # SPA mit Hash-Router
│   ├── styles.css          # Plaximo Design System (4400+ Zeilen)
│   ├── app.js              # Haupt-App-Logik
│   ├── scout.js            # Live-Scout Statistik-Engine (~2000 Zeilen)
│   ├── router.js           # Hash-basierter SPA-Router
│   ├── coach.html          # NEU: Trainer-Dashboard (standalone)
│   ├── help.html           # NEU: Hilfe-Dokumentation (standalone)
│   ├── scoreboard.js       # NEU: Scoreboard-Steuerung (vom User hinzugefügt)
│   └── overlay/            # OBS Browser-Source Overlays
├── relay/                  # Go Backend (WebSocket + REST)
│   ├── main.go             # HTTP Server
│   └── scout_store.go      # Scout-Daten Persistenz
├── docker-compose.yml      # Container-Orchestrierung
└── Caddyfile               # Reverse Proxy Konfiguration
```

---

## Kritische Bugs (Behoben in dieser Session)

### Bug 1: Type Mismatch bei Spieler-IDs
**Problem**: Server speichert IDs als Strings (`"1769104781442.158"`), aber `parseFloat()` im Frontend macht Zahlen daraus.

```javascript
// FALSCH (===):
const player = this.data.players.find(p => p.id === playerId);
// "12345" === 12345 → FALSE → player = undefined

// RICHTIG (==):
const player = this.data.players.find(p => p.id == playerId);
// "12345" == 12345 → TRUE
```

**Betroffene Dateien**: `web/scout.js` (10 Stellen geändert)
**Zeilen**: 392, 401, 482, 689, 715, 727, 758, 873, 961, 962

### Bug 2: Double-Firing von Events
**Problem**: `initTableListeners()` könnte mehrfach aufgerufen werden, was zu doppelten Event-Listenern führt.

**Lösung**: Guard-Flag hinzugefügt:
```javascript
initTableListeners() {
    if (this.tableListenersInitialized) return;
    this.tableListenersInitialized = true;
    // ...
}
```

**Datei**: `web/scout.js` Zeile ~624

---

## Neue Features (Diese Session)

### 1. Coach Dashboard (`web/coach.html`)
- **Standalone-Seite** (nicht im SPA-Router)
- Zeigt Team-Durchschnitte: Angriff, Annahme, Aufschlag, Block
- Zählt Asse (Aufschlag Score=3) und Fehler (Score=0)
- "Startaufstellung"-Karten für aktive Spieler
- Tabelle aller Spieler mit Einzelstatistiken
- **Auto-Refresh**: `setInterval(loadData, 5000)`
- API-Endpoint: `GET /api/scout`

### 2. Help-Seite (`web/help.html`)
- Vollständige Dokumentation:
  - Bewertungsskala (0-3)
  - Tastaturkürzel (Quick-Scout)
  - Spielerverwaltung
  - Positionen (Z, D, AA, MB, L)
  - Startaufstellung (Active Toggle)
  - Server-Sync Info

### 3. Active Toggle Verbesserung
**CSS** (`styles.css` Zeilen 4111-4144):
- Größe: 20px → 24px
- Leerer Zustand: `border: 2px dashed` (besser sichtbar)
- Aktiver Zustand: `hsl(142 60% 32%)` (dunkleres Grün)

### 4. Kontrast-Fix
**Problem**: `#10b981` (Grün) auf weißem Hintergrund hatte zu wenig Kontrast.
**Lösung**: `hsl(142 60% 32%)` - dunkleres Grün, WCAG AA konform.

**CSS** (`styles.css` Zeile 2584):
```css
.scout-cell-avg.avg-good {
    color: hsl(142 60% 32%);  /* War: #10b981 */
}
```

---

## Scout Engine Funktionsweise

### Datenstruktur
```javascript
{
  players: [
    {
      id: "1769104781442.158",  // ACHTUNG: String!
      name: "Max",
      number: 7,
      position: "AA",  // Z, D, AA, MB, L
      active: true,     // Startaufstellung
      stats: {
        aufschlag: [3, 2, 0, 3],  // Array von Scores 0-3
        annahme: [2, 2, 1],
        angriff: [3, 3, 2],
        block: [3],
        feldabwehr: [],
        freeball: []
      }
    }
  ],
  version: 42  // Server-Sync Version
}
```

### Speicherung
1. **localStorage**: `volleybratans_scout` (Fallback)
2. **Server**: `GET/POST /api/scout` (Primär)

### Sync-Logik
```javascript
initServerSync() {
    this.syncInterval = setInterval(() => this.sync(), 5000);
}
```

---

## Deployment

### Server-Zugangsdaten
- **Host**: 46.224.233.14
- **User**: root
- **Passwort**: Volley2024!LiveStream
- **Projekt-Pfad**: /root/VolleyBratansStream

### Deploy-Befehle
```bash
git add .
git commit -m "message"
git push

ssh root@46.224.233.14
cd /root/VolleyBratansStream
git pull
docker compose up -d --build
```

### Cache-Busting
**WICHTIG**: Bei Änderungen an CSS/JS müssen die Version-Tags erhöht werden:
```html
<link rel="stylesheet" href="styles.css?v=6">
<script src="scout.js?v=4"></script>
```

---

## Bekannte Stellen für Debugging

### Scout nicht funktioniert online
1. Cache prüfen: `curl -s https://stream.volleybratans.com/scout.js | findstr "initTableListeners"`
2. Version-Tag in `index.html` prüfen
3. Browser DevTools → Console auf Fehler prüfen
4. Typ-Mismatch: `console.log(typeof player.id, typeof playerId)`

### Server-Sync fehlgeschlagen
1. Network Tab → `/api/scout` prüfen
2. Relay-Logs: `docker logs volleybratans-relay`

### Styles laden nicht
1. Version-Tag erhöhen
2. Hard Reload: Strg+Shift+R

---

## Offene Aufgaben (Nicht deployed)

Die folgenden Änderungen sind **lokal vorhanden aber noch NICHT deployt**:

1. ✅ Type Mismatch Fix (`===` → `==`)
2. ✅ Double-Firing Guard
3. ✅ Coach Dashboard (`coach.html`)
4. ✅ Help-Seite (`help.html`)
5. ✅ Active Toggle CSS
6. ✅ Kontrast-Fix
7. ⚠️ Scoreboard-Steuerung (`scoreboard.js`) - vom User hinzugefügt, noch nicht getestet

**Nächster Schritt**: `git push` und `docker compose up -d --build` auf Server

---

## Wichtige CSS-Klassen (Scout)

| Klasse | Beschreibung |
|--------|--------------|
| `.scout-active-toggle` | Startaufstellungs-Rechteck |
| `.scout-position-badge` | Position-Badge (Z, D, AA, MB, L) |
| `.scout-score-btn` | Score-Buttons (0, 1, 2, 3) |
| `.scout-cell-avg` | Durchschnittswert-Zelle |
| `.avg-good` / `.avg-ok` / `.avg-bad` | Farbkodierung nach Threshold |
| `.scout-player-row` | Spielerzeile in Tabelle |

---

## Debugging-Workflow

1. **Lokal testen**: `npx serve web -p 5000` oder Datei öffnen
2. **Browser-Subagent nutzen** für echtes Testen
3. **Console-Logs prüfen**: `console.log(window.scoutEngine)`
4. **Code im Browser inspizieren**: `window.scoutEngine.addScore.toString()`
5. **Nach Deploy**: Hard Reload + Version-Check
