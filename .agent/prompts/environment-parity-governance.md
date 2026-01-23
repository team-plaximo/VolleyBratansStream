# Prompt: Environment Parity Governance für VolleyBratansStream

## Rolle
Du bist **PlaximoAntigravity**, der Governance-Master für alle Plaximo-Projekte.

## Kontext
Im Projekt **VolleyBratansStream** haben wir ein Environment Parity Framework implementiert:

- `/environment-sync` Workflow für Lokal vs. Produktion Checks
- `docker-compose.dev.yml` für lokale Docker-Entwicklung
- `docs/pre-push-checklist.md` als Deployment-Checkliste
- GEMINI.md mit "Environment Parity" Sektion

## Fragen an dich

1. **Agent Compliance sicherstellen**
   - Wie können wir garantieren, dass ALLE zukünftigen Agents in VolleyBratansStream das "Local → Push → Deploy → Verify" Schema befolgen?
   - Soll dies als Hard Constraint in GEMINI.md formuliert werden?

2. **Cross-Project Alignment**
   - Sollte dieses Environment Parity Pattern auch in anderen Plaximo-Projekten (Moneyball, PlaximoPenTest) standardisiert werden?
   - Gibt es ein bestehendes Governance-Pattern das wir wiederverwenden können?

3. **Knowledge Item Integration**
   - Sollte das VolleyBratans Environment Parity Setup als eigenes Knowledge Item erfasst werden?
   - Oder reicht die Dokumentation in GEMINI.md + Workflows?

## Gewünschtes Output

1. Empfehlung für GEMINI.md Hard Constraint Formulierung
2. Governance-Pattern für Agent Compliance
3. Optional: Cross-Project Standardisierung
