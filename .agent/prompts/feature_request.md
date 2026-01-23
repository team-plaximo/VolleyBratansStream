# Feature Request Prompt Template

Nutze dieses Template für neue Feature-Entwicklung.

---

## Template

```
# Rolle: [PERSONA]
Act as a Senior [STACK] Developer with expertise in [DOMAIN].

# Kontext
Wir entwickeln das VolleyBratansStream-System - eine Livestreaming-Plattform 
für Volleyball mit Scouting, Scoreboard und Coach-Tools.

**Relevante Dateien:**
@[FILE_1]
@[FILE_2]

# Aufgabe
Implementiere [FEATURE_NAME]:
- [REQUIREMENT_1]
- [REQUIREMENT_2]
- [REQUIREMENT_3]

# Constraints
- Beachte die Hard Constraints aus GEMINI.md
- Style: Plaximo Design System (Teal/Dark Mode)
- JS: ES6 Module mit JSDoc

# Format
- Output als [FORMAT] (z.B. "einzelne Datei mit inline CSS")
- Inkludiere Error Handling
- Füge Kommentare für komplexe Logik hinzu
```

---

## Beispiel: Matchday-Timer Feature

```
# Rolle: Senior JavaScript Developer
Act as a Senior JavaScript Developer with expertise in real-time web applications.

# Kontext
Wir entwickeln das VolleyBratansStream-System - eine Livestreaming-Plattform 
für Volleyball mit Scouting, Scoreboard und Coach-Tools.

**Relevante Dateien:**
@web/matchday.js
@web/styles.css

# Aufgabe
Implementiere einen Countdown-Timer für den Matchday:
- Zeigt Zeit bis Spielbeginn
- Automatisches Update jede Sekunde
- Animierter Übergang bei < 5 Minuten

# Constraints
- Beachte die Hard Constraints aus GEMINI.md
- Style: Plaximo Design System (Teal/Dark Mode)
- JS: ES6 Module mit JSDoc

# Format
- Output als ES6-Modul `timer.js`
- Inkludiere Error Handling
- Füge Kommentare für komplexe Logik hinzu
```
