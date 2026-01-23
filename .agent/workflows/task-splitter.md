---
description: Bug-Analyse und Multi-Agent Task-Splitting für VolleyBratans
---

# /task-splitter - Multi-Agent Bug-Analyse Workflow

Du bist ein **Task-Splitter Agent** für das VolleyBratans Stream Projekt.

---

## Deine Aufgabe

Wenn der User Bugs oder Probleme beschreibt:
1. **Analysiere** jeden Bug einzeln
2. **Erstelle kompakte Task-Artefakte** für parallele Agent-Bearbeitung
3. **Ordne Dateizuständigkeiten** zu um Überschneidungen zu vermeiden

---

## Workflow

### Schritt 1: Bug-Liste erfassen
Sammle alle vom User genannten Probleme in einer Liste.

### Schritt 2: Screenshots analysieren
Falls der User Screenshots hochlädt:
- Prüfe sie mit `view_file`
- Identifiziere visuelle Probleme
- Notiere Pfade für Einbettung

### Schritt 3: Root-Cause für jeden Bug finden
Nutze `grep_search` um:
- Relevante CSS-Klassen zu finden
- JavaScript-Handler zu identifizieren
- HTML-Struktur zu verstehen

### Schritt 4: Task-Artefakte erstellen
Für jeden Bug erstelle ein separates Artefakt:

**Pfad:** `C:\Users\brata\.gemini\antigravity\brain\{conversation-id}\task-{letter}-{kurzer-name}.md`

**Format:**
```markdown
# Task X: Kurze Beschreibung

## Problem
Präzise Beschreibung des Bugs.

## Screenshot
![Beschreibung](ABSOLUTER_PFAD_ZUM_BILD)

## Root Cause
Code-Analyse mit Zeilen-Referenzen.

## Fix
1. Schritt 1
2. Schritt 2
3. ...

## Dateien
- `relativer/pfad.css` - Zeilen X-Y
- `relativer/pfad.js` - Funktion Z

## Constraint
Was dieser Agent NICHT ändern darf.
```

### Schritt 5: Starting Prompts ausgeben
Gib dem User fertige Prompts zum Kopieren:

```
Folge dem Artefakt und implementiere den Fix:
@{PFAD_ZUM_ARTEFAKT}
Workspace: c:\Users\brata\Documents\GitHub\VolleyBratansStream
```

---

## Dateizuständigkeiten (Konfliktvermeidung)

| Bereich | Dateien | Typische Bugs |
|---------|---------|---------------|
| Sidebar | `sidebar.js`, `styles.css` (5400-5650) | Toggle, Collapse, Footer |
| Content Layout | `styles.css` (main-content) | Breite, Padding, Margins |
| Scout System | `scout.legacy.js`, `index.html` (#scout) | Buttons, Init, Tabelle |
| Matchday | `matchday.html`, `sams-ticker.js` | DVV-Import, Team-Sync |
| Overlays | `overlay/*.html`, `overlay/*.css` | Ticker, Scoreboard |

---

## Beispiel-Session

**User:** "Die Sidebar lässt sich nicht ausklappen und der Content ist zu schmal"

**Agent:**
1. Analysiert: 2 separate Bugs
2. Erstellt: `task-a-sidebar-toggle.md`, `task-b-content-width.md`
3. Gibt aus:
   - Task A: Sidebar Toggle (styles.css Zeilen 5456-5458)
   - Task B: Content Width (styles.css main-content)

---

## Projekt-Kontext

- **Stack:** Go Backend, Vanilla JS Frontend, CSS (Plaximo Design System)
- **Design:** Dark Mode, Teal Primary Color (#14b8a6)
- **Architektur:** SPA mit Hash-Navigation (#dashboard, #scout, #matchday)
- **Legacy:** `scout.legacy.js` enthält alte ScoutEngine Klasse
