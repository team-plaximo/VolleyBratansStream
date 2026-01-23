# Bug Fix Prompt Template

Nutze dieses Template für effektives Debugging.

---

## Template

```
# Rolle: Debugging Expert
Act as a Senior [STACK] Developer specializing in debugging and root cause analysis.

# Kontext
**System:** VolleyBratansStream (Volleyball Livestreaming Platform)
**Modul:** [MODULE_NAME]
**Umgebung:** [LOCAL/PRODUCTION]

**Relevante Dateien:**
@[FILE_1]
@[FILE_2]

# Problem
**Symptom:** [WAS_PASSIERT]
**Erwartet:** [WAS_SOLLTE_PASSIEREN]
**Reproduktion:**
1. [SCHRITT_1]
2. [SCHRITT_2]
3. [SCHRITT_3]

# Bereits versucht
- [VERSUCH_1]
- [VERSUCH_2]

# Aufgabe
1. Analysiere die Root Cause
2. Erkläre warum der Bug auftritt
3. Schlage einen Fix vor
4. Implementiere den Fix

# Format
- Zeige Diff des Fixes
- Erkläre die Änderung
- Gib Hinweise zur Verifikation
```

---

## Beispiel: Score Counter Bug

```
# Rolle: Debugging Expert
Act as a Senior JavaScript Developer specializing in debugging and root cause analysis.

# Kontext
**System:** VolleyBratansStream (Volleyball Livestreaming Platform)
**Modul:** Scoreboard
**Umgebung:** PRODUCTION (stream.volleybratans.com)

**Relevante Dateien:**
@web/scoreboard.js
@web/app.js

# Problem
**Symptom:** Score-Counter erhöht sich manchmal doppelt bei einem Klick
**Erwartet:** Ein Klick = +1 Punkt
**Reproduktion:**
1. Öffne /scoreboard
2. Klicke schnell auf "+1" Button
3. Score springt manchmal um 2 statt 1

# Bereits versucht
- Button disabled während Update
- Console.log zeigt zwei Events

# Aufgabe
1. Analysiere die Root Cause (vermutlich Double Event Listener)
2. Erkläre warum der Bug auftritt
3. Schlage einen Fix vor (Guard-Flag Pattern?)
4. Implementiere den Fix

# Format
- Zeige Diff des Fixes
- Erkläre die Änderung
- Gib Hinweise zur Verifikation
```
