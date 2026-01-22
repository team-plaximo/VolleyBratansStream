# Moblin Remote Control - WebSocket API Reference

## Overview

The Moblin Remote Control uses WebSocket for real-time bidirectional communication between the browser interface, relay server, and Moblin iOS app.

## Connection

### WebSocket Endpoint
```
ws://your-server:8080/ws
```

### Client Types
- **Browser**: Default connection type
- **Moblin App**: Connect with `?type=moblin` query parameter

Example:
```
# Browser
ws://localhost:8080/ws

# Moblin App
ws://localhost:8080/ws?type=moblin
```

## Authentication

If the server requires a password, authenticate immediately after connecting:

```json
{
  "type": "auth",
  "password": "your-password"
}
```

**Responses:**
```json
{"type": "auth_success", "status": "ok"}
{"type": "auth_failed", "status": "error", "message": "Invalid password"}
```

## Commands (Browser → Moblin)

### Scene Control
```json
{"type": "set_scene", "name": "main"}
```
Supported scenes: `main`, `wide`, `closeup`, `pip`, `court_overview`, `scoreboard`, `interview`, `replay`, `BRB`

### Bitrate Control
```json
{"type": "set_bitrate", "kbps": 6000}
```
Range: 1000-15000 kbps

### Zoom Control
```json
{"type": "set_zoom", "level": 2.5}
```
Range: 1.0-5.0

### Stream Control
```json
{"type": "go_live"}
{"type": "end"}
```

### Quick Actions
```json
{"type": "toggle_mic"}
{"type": "toggle_torch"}
{"type": "snapshot"}
{"type": "toggle_recording"}
```

## Status Updates (Moblin → Browser)

### Stream Info
```json
{
  "type": "stream_info",
  "bitrate": 6000,
  "fps": 30,
  "battery": 85,
  "viewers": 42,
  "thermal_state": "fair",
  "upload_stats": {
    "lte": {"kbps": 4500, "rtt": 45},
    "wifi": {"kbps": 1500, "rtt": 15}
  }
}
```

### Thermal States
| State | Description |
|-------|-------------|
| `fair` | Normal (Cool) |
| `nominal` | Normal |
| `serious` | Warm/Warning |
| `critical` | Hot/Critical |

### Scene Changed
```json
{"type": "scene_changed", "scene": "wide"}
```

### Stream Events
```json
{"type": "stream_started"}
{"type": "stream_ended"}
```

### Toggle States
```json
{"type": "recording_state", "recording": true}
{"type": "mic_state", "muted": false}
{"type": "torch_state", "enabled": true}
```

### OBS WebSocket Status
```json
{"type": "obs_connected"}
{"type": "obs_disconnected"}
```

## Relay Events

### Connection Events
```json
{"type": "moblin_connected"}
{"type": "moblin_disconnected"}
```

## Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T13:08:52+01:00"
}
```

## Error Handling

```json
{"type": "error", "message": "Not authorized"}
```

---
*API Version 1.0 - VolleyBratansStream*
