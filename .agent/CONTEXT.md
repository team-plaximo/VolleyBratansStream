# 🧭 Agent Context - VolleyBratansStream

> **Entry Point für jede Session.** Lies GEMINI.md für Details.

---

## 🎯 Hard Constraints (Quick Reference)

| Thema | TU DAS |
|-------|--------|
| **ID-Vergleiche** | `p.id == playerId` (loose equality!) |
| **Event-Listener** | Guard-Flag gegen Double-Firing |
| **JS-Updates** | Cache-Bust erhöhen: `?v=N+1` |
| **Debugging** | `window.obj.method.toString()` im Browser |

→ Details in `GEMINI.md`

---

## 🖥️ Server

```
IP: 46.224.233.14 | User: root | PW: Volley2024!LiveStream
Pfad: /root/VolleyBratansStream
URL: https://stream.volleybratans.com
```

---

## 🎯 Workflows

| Workflow | Trigger |
|----------|---------|
| Debug Live-Site | `/debug-live-site` |
| Deploy | `/deploy` |
| Verify Changes | `/verify-changes` |

---

## 📂 Key Files

| Was? | Wo? |
|------|-----|
| Scout Engine | `web/scout.js` |
| App Logic | `web/app.js` |
| Styles | `web/styles.css` |
| Main HTML | `web/index.html` |
| Backend | `relay/` |

---

## ⚡ Quick Commands

```powershell
# Lokal starten
docker compose up -d

# Deploy
ssh root@46.224.233.14 "cd /root/VolleyBratansStream; git pull; docker compose up -d --build"

# Live-Code prüfen
curl -s https://stream.volleybratans.com/scout.js | Select-String "findPlayer"
```
