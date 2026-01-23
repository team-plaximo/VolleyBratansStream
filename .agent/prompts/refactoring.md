# Refactoring Prompt Template

Nutze dieses Template für Code-Verbesserungen.

---

## Template

```
# Rolle: Code Quality Architect
Act as a Senior Software Architect with expertise in clean code and refactoring patterns.

# Kontext
**System:** VolleyBratansStream (Volleyball Livestreaming Platform)
**Architektur-Standard:** Moneyball Enterprise Patterns
**Design-System:** Plaximo (Teal/Dark Mode)

**Zu refactoren:**
@[TARGET_FILE]

**Referenz für guten Stil:**
@[REFERENCE_FILE]

# Aktueller Zustand
[BESCHREIBUNG_DES_PROBLEMS]
- [ISSUE_1]: [WARUM_SCHLECHT]
- [ISSUE_2]: [WARUM_SCHLECHT]

# Ziel
[GEWÜNSCHTER_ZUSTAND]
- [VERBESSERUNG_1]
- [VERBESSERUNG_2]

# Aufgabe
Refaktoriere den Code nach diesen Prinzipien:
1. [PRINZIP_1]
2. [PRINZIP_2]
3. [PRINZIP_3]

# Constraints
- Keine Breaking Changes an Public API
- Behalte bestehende Funktionalität
- Beachte GEMINI.md Hard Constraints

# Format
- Zeige vorher/nachher Diff
- Erkläre jede signifikante Änderung
- Liste potenzielle Risiken auf
```

---

## Beispiel: Scout.js Modularisierung

```
# Rolle: Code Quality Architect
Act as a Senior Software Architect with expertise in clean code and ES6 module patterns.

# Kontext
**System:** VolleyBratansStream (Volleyball Livestreaming Platform)
**Architektur-Standard:** Moneyball Enterprise Patterns
**Design-System:** Plaximo (Teal/Dark Mode)

**Zu refactoren:**
@web/scout.js

**Referenz für guten Stil:**
@web/modules/sidebar.js

# Aktueller Zustand
scout.js ist eine 800-Zeilen Monolith-Datei:
- Player CRUD: 200 Zeilen vermischt mit UI-Code
- Score Logic: 150 Zeilen ohne klare Trennung
- Event Handler: Überall verstreut

# Ziel
Modulare Architektur nach ES6 Standards:
- Separate Module für Player, Score, UI
- Klare Dependency Injection
- Testbare Einzelkomponenten

# Aufgabe
Refaktoriere den Code nach diesen Prinzipien:
1. Single Responsibility Principle
2. Module Pattern (ES6 import/export)
3. Event Delegation statt direkter Listener

# Constraints
- Keine Breaking Changes an Public API
- Behalte bestehende Funktionalität
- Beachte GEMINI.md Hard Constraints

# Format
- Zeige vorher/nachher Diff
- Erkläre jede signifikante Änderung
- Liste potenzielle Risiken auf
```
