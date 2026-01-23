# VolleyBratansStream

> **Live-Streaming Platform für Volleyball** | Vanilla JS + Python Backend

## 📍 Navigation

| Dokument | Beschreibung |
|----------|--------------|
| [.agent/CONTEXT.md](.agent/CONTEXT.md) | Quick-Reference für Sessions |
| [web/DESIGN_SYSTEM.md](web/DESIGN_SYSTEM.md) | Design Tokens & Patterns |

---

## 🎯 HARD CONSTRAINTS

### 1. Type-Safety bei IDs 🔴

```javascript
// Server serialisiert IDs als Strings, JS kann Numbers haben!
// ❌ FALSCH - schlägt STILL fehl
const player = players.find(p => p.id === playerId);

// ✅ RICHTIG - loose equality
const player = players.find(p => p.id == playerId);
// ODER explizite Konvertierung
const player = players.find(p => String(p.id) === String(playerId));
```

### 2. Event-Listener Double-Firing Prevention 🔴

```javascript
// Bei SPA-Navigation werden Listener mehrfach registriert!
// ✅ LÖSUNG: Guard-Flag
initTableListeners() {
    if (this.tableListenersInitialized) return;
    this.tableListenersInitialized = true;
    // ...
}
```

### 3. Cache-Busting bei JS-Updates 🟡

```html
<!-- In index.html: Version bei JEDEM JS-Update erhöhen! -->
<script src="scout.js?v=3"></script>
<!-- Beide Dateien committen: index.html + scout.js -->
```

### 4. Live-Code-Inspektion 🟢

```javascript
// Im Browser DevTools Console:
window.scoutEngine?.addScore?.toString()  // Zeigt echten Server-Code
typeof variable                            // Type-Check
```

### 5. Environment Parity Protocol 🔴

> **HARD CONSTRAINT**: Alle Änderungen folgen dem 4-Phasen-Deployment-Protokoll.

```
┌─────────┐    ┌──────┐    ┌────────┐    ┌────────┐
│ 1. Lokal│ → │2.Push│ → │3.Deploy│ → │4.Verify│
│  Test   │    │  Git │    │ Server │    │  Live  │
└─────────┘    └──────┘    └────────┘    └────────┘
```

**BEVOR du Code pushst:**
- Lokaler Test mit `python -m http.server 8088` **ODER** `docker compose -f docker-compose.dev.yml up`
- Browser DevTools Console: **KEINE JavaScript-Fehler**
- `docs/pre-push-checklist.md` durcharbeiten

**NACH jedem Deploy:**
- `/environment-sync` ausführen **ODER** manuell Git-Hash-Parity prüfen
- Health Check: `curl https://stream.volleybratans.com/health`

❌ **VERBOTEN**: Direkt auf dem Server entwickeln | Push ohne lokalen Test | Deploy ohne Verification

---

## 🖥️ Server & Deployment

| Info | Wert |
|------|------|
| **Server IP** | `46.224.233.14` |
| **User** | `root` |
| **Passwort** | `Volley2024!LiveStream` |
| **Pfad** | `/root/VolleyBratansStream` |
| **URL** | `https://stream.volleybratans.com` |

```powershell
# Quick Deploy
ssh root@46.224.233.14
cd /root/VolleyBratansStream; git pull; docker compose up -d --build
```

---

## 🎯 Workflows

| Workflow | Beschreibung |
|----------|--------------|
| `/environment-sync` | Environment Parity Check (Lokal vs. Produktion) |
| `/debug-live-site` | Live-Site Debugging (Local vs Online) |
| `/deploy` | Quick-Deploy zum Server |
| `/verify-changes` | Verification nach Änderungen |

---

## 🔄 Environment Parity (WICHTIG!)

> **Vor jedem größeren Push:** `/environment-sync` ausführen!

### Regel: Local → Push → Deploy → Verify

```
┌─────────┐    ┌──────┐    ┌────────┐    ┌────────┐
│ Lokal   │ → │ Push │ → │ Deploy │ → │ Verify │
│ Testen  │    │ Git  │    │ Server │    │ Live   │
└─────────┘    └──────┘    └────────┘    └────────┘
```

### ❌ NIEMALS direkt auf dem Server entwickeln!

### Referenz-Dateien

| Datei | Zweck |
|-------|-------|
| `docker-compose.yml` | Produktion |
| `docker-compose.dev.yml` | Lokale Docker-Entwicklung |
| `.env.production` | Produktions-Umgebung |
| `docs/pre-push-checklist.md` | Pre-Push Checkliste |

## 📂 Struktur

```
web/
├── index.html      # Hauptseite
├── scout.js        # Live Scout Engine (76KB)
├── app.js          # App-Logik (63KB)
├── styles.css      # Styling (90KB)
├── sams-ticker.js  # SBVV Integration
└── overlay/        # Stream Overlays

relay/              # Python WebSocket Backend
data/               # Persistente Daten
```

---

## 💻 Terminal = PowerShell

| Bash (FALSCH ❌) | PowerShell (RICHTIG ✅) |
|-----------------|------------------------|
| `cmd1 && cmd2` | `cmd1; cmd2` |
| `export VAR=val` | `$env:VAR = "val"` |
