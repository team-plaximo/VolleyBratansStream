# Scouting System - Vollständige Anleitung

> **Autor:** Fynn Pflüger  
> **Zuletzt aktualisiert:** Januar 2026  
> **Quelle:** Team Statistik Merkblatt + Statistik Vorlage.xlsx

---

## Übersicht

Das Scouting-System erfasst sechs Spielelemente mit einer **Notenskala von 0-3**. Die Bewertungen werden pro Spieler dokumentiert und automatisch zu Team-Statistiken aggregiert.

---

## Bewertungsskala (0-3)

| Note | Bedeutung |
|------|-----------|
| **3** | Sehr gut / Direkter Punkt / Perfekt |
| **2** | Gut / Mit Wirkung |
| **1** | Ohne Wirkung / MA nicht einsetzbar |
| **0** | Fehler / Direkter Fehler |

---

## Die 6 Spielelemente

### 1. Aufschlag

| Note | Kriterium |
|------|-----------|
| **3** | Direkter Punkt (Gegner kann Ball max. 1x berühren) |
| **2** | Gegner kann keinen Mittelangreifer (MA) einsetzen |
| **1** | Ohne Wirkung |
| **0** | Fehler |

**Bewertungsbereich:**
- 3.0 - 2.0: Sehr gut
- 1.0 - 1.9: Ok / gut
- 0.0 - 0.9: Schlecht

---

### 2. Annahme

| Note | Kriterium |
|------|-----------|
| **3** | Perfekt |
| **2** | Nicht perfekt, aber MA kann eingesetzt werden |
| **1** | MA kann nicht eingesetzt werden |
| **0** | Direkter Fehler |

> ⚠️ **Wichtig:** Flache Annahmen, die am richtigen Ort ankommen, gelten **NIE** als perfekt!

**Bewertungsbereich:**
- 3.0 - 2.0: Sehr gut
- 1.9 - 1.0: Ok / gut
- 0.9 - 0.0: Schlecht

---

### 3. Angriff

| Note | Kriterium |
|------|-----------|
| **3** | Direkter Punkt |
| **2** | Mit Wirkung (Freeball oder nochmal aufbauen) |
| **1** | Ohne Wirkung (Gegner kann angreifen) |
| **0** | Fehler |

> 📊 Die Spalte "Bälle" zeigt die Gesamtzahl der Angriffe aus Zuspiel an.

**Bewertungsbereich:**
- 3.0 - 2.0: Sehr gut
- 1.9 - 1.0: Ok / gut
- 0.9 - 0.0: Schlecht

---

### 4. Block

| Note | Kriterium |
|------|-----------|
| **3** | Kill Block (direkter Punkt) |
| **0** | Block angeschlagen, falsche Stelle, oder nicht vorhanden → Punkt für Gegner |

> ⚠️ Blocktouches ohne direkten Punkt oder Fehler sind **aus der Statistik ausgeschlossen**.

**Bewertungsbereich:**
- 3.0 - 1.5: Sehr gut
- 1.4 - 0.5: Ok / gut
- 0.4 - 0.0: Schlecht

---

### 5. Feldabwehr

| Note | Kriterium |
|------|-----------|
| **3** | Ball kann weitergespielt werden (gilt auch für Cover) |
| **0** | Ball kann nicht weitergespielt werden |

**Bewertungsbereich:**
- 3.0 - 1.5: Sehr gut
- 1.4 - 0.5: Ok / gut
- 0.4 - 0.0: Schlecht

---

### 6. Freeball

| Note | Kriterium |
|------|-----------|
| **3** | Wird perfekt angespielt |
| **0** | Wird nicht perfekt angespielt (oder Fehler) |

**Bewertungsbereich:**
- 3.0 - 1.5: Muss (Erwartung)
- 1.5 - 0.0: Schlecht

---

## Zusätzliche Statistiken

### Kill Ratio
**Formel:** `Direkte Punkte / Gesamtzahl der Angriffe`

| Bereich | Bewertung |
|---------|-----------|
| 50% - 100% | Sehr gut |
| 40% - 49.99% | Ok / gut |
| 0% - 39.99% | Schlecht |

### Annahme-Quote
**Formel:** `Perfekte Annahmen / Gesamtzahl der Annahmen`

| Bereich | Bewertung |
|---------|-----------|
| 50% - 100% | Sehr gut |
| 40% - 49.99% | Ok / gut |
| 0% - 39.99% | Schlecht |

### Weitere Metriken
- **Punkte:** Gesamtzahl aller Punkte aus eigener Kraft
- **UE (Unforced Errors):** Aufschlags- und Angriffsfehler
- **Elemente Ranking:** Ordnet die 6 Spielelemente nach erzielter Note

---

## Excel-Vorlage Struktur

Die `Statistik Vorlage.xlsx` enthält:

### Spalten-Layout (40 Spalten)

| Spaltengruppe | Inhalt |
|---------------|--------|
| **A** | Spielername |
| **B-G** | Aufschlag (3, 2, 1, 0, Bälle, Durchschnitt) |
| **H-M** | Annahme (3, 2, 1, 0, Bälle, Durchschnitt) |
| **N-S** | Angriff (3, 2, 1, 0, Bälle, Durchschnitt) |
| **T-W** | Block (3, 0, Gesamt) |
| **X-Z** | Feldabwehr (3, 0, Gesamt) |
| **AA-AC** | Freeball (3, 0, Gesamt) |
| **AD-AN** | Zusatzstatistiken |

### Automatische Berechnungen

```
Durchschnitt = (Anzahl_3×3 + Anzahl_2×2 + Anzahl_1×1 + Anzahl_0×0) / Gesamt
```

Die letzte Zeile "TEAM" aggregiert automatisch alle Spielerstatistiken.

---

## Bedienung im Live-Scouting

### Button-Steuerung
1. **Spieler auswählen** (Dropdown oder Schnellwahl)
2. **Aktion wählen** (Aufschlag, Annahme, Angriff, Block, Feldabwehr, Freeball)
3. **Note vergeben** (0-3)

### Keyboard-Shortcuts (Quick-Scout Modus)
- Tastenkürzel für schnelle Eingabe während des Spiels
- Korrektur-Funktion für fehlerhafte Einträge

---

## Bewertungshinweise

> 💡 **Grundsätzlich können Note und Prozent-Statistik zur Bewertung herangezogen werden. ABER: Die Note ist aussagekräftiger, wenn auch etwas abstrakter als die Prozentzahl.**

### Best Practices
1. Konsistent bewerten - gleiche Maßstäbe für alle Spieler
2. Bei Unsicherheit die konservativere Note wählen
3. Blocktouches ohne klares Ergebnis ignorieren
4. Annahmequalität nicht mit Annahmeposition verwechseln
