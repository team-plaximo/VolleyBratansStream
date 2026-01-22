# Critic Proposal: Plaximo Calculator

## Quality & Verification Focus

### Accessibility Anforderungen (WCAG 2.1 AA)
- [ ] `lang="de"` auf `<html>`
- [ ] Keyboard-Navigation (Tab-Order)
- [ ] `aria-label` für alle Buttons
- [ ] High Contrast Mode Support
- [ ] Screen Reader Announcements für Ergebnisse

### Edge Cases zu testen
1. **Division by Zero** → "Error" anzeigen, nicht crashen
2. **Overflow** → Große Zahlen formatieren oder warnen
3. **Dezimalzahlen** → Komma vs. Punkt handling
4. **Negative Zahlen** → (-) Toggle Button
5. **Mehrfache Operatoren** → Letzte Eingabe überschreiben

### Security Considerations
- **Kein `eval()`!** → Explizite Operation-Funktionen
- Input Validation für alle Eingaben
- XSS-safe DOM Manipulation (textContent statt innerHTML)

### Testing Checklist
```
[ ] Alle 4 Operationen (+, -, *, /)
[ ] Clear/Reset Funktion
[ ] Keyboard Input (Numpad)
[ ] Mobile Touch Events
[ ] Dark/Light Mode Toggle
```

## Priorität: Robustheit + Security

**Vote**: Builder's eingebettete Lösung + meine Security-Additions.
