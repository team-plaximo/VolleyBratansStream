# Moblin Remote Control

A premium remote control interface for the Moblin mobile streaming app.

![Status](https://img.shields.io/badge/status-development-blue)
![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)

## Features

- 🎮 **Real-time Stream Control** - Scene switching, bitrate, zoom adjustments
- 📊 **Live Stats Monitoring** - FPS, bitrate, battery, viewers
- 🌡️ **Thermal Monitoring** - Color-coded device temperature alerts
- 📶 **Network Interface Stats** - LTE and WiFi throughput monitoring (SRTLA)
- ⚡ **Quick Actions** - Mic, Torch, Snapshot, BRB, Recording toggles
- 🎬 **OBS WebSocket Status** - Connection indicator for OBS integration
- 🔐 **Password Protection** - Secure your stream controls
- 🌐 **WebSocket Relay** - NAT-friendly connection bridge
- 📱 **Responsive Design** - Works on desktop and mobile

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ Moblin App  │◄────►│ Relay Server │◄────►│   Browser   │
│   (iOS)     │  WS  │    (Go)      │  WS  │    (Web)    │
└─────────────┘      └──────────────┘      └─────────────┘
```

## Quick Start

### 1. Start the Relay Server

```bash
cd relay
go mod tidy
go run main.go --port 8080 --password your-secret
```

### 2. Open the Web Interface

Open `http://localhost:8080` in your browser, or directly open `web/index.html`.

### 3. Connect Your Moblin App

Configure your Moblin app to connect to `ws://your-server:8080/ws?type=moblin`

## Environment Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `localhost:8080,127.0.0.1:8080,localhost:3000` |

Example:
```bash
ALLOWED_ORIGINS="https://stream.example.com,https://control.example.com" go run main.go
```

## Project Structure

```
VolleyBratansStream/
├── web/                    # Frontend
│   ├── index.html          # Main HTML
│   ├── styles.css          # Glassmorphism styles
│   └── app.js              # WebSocket client
├── relay/                  # Backend
│   ├── main.go             # Go relay server
│   └── go.mod              # Go dependencies
├── docs/                   # Documentation
│   └── API.md              # WebSocket Protocol
└── README.md
```

## Camera Scene Presets

| Scene | Description |
|-------|-------------|
| `main` | Primary camera angle |
| `wide` | Wide-angle shot |
| `closeup` | Close-up/detail shot |
| `pip` | Picture-in-Picture |
| `court_overview` | Full volleyball court view |
| `scoreboard` | Score display focus |
| `interview` | Player/coach interview |
| `replay` | Highlight replay scene |

## Quick Actions

| Action | Icon | Command Type |
|--------|------|--------------|
| Mic | 🎤 | `toggle_mic` |
| Torch | 🔦 | `toggle_torch` |
| Snapshot | 📷 | `snapshot` |
| BRB | ⏸️ | `set_scene` (BRB) |
| Record | ⏺️ | `toggle_recording` |

## Telemetry Features

### Thermal Monitoring
- 🟢 **Cool/Fair** - Normal operating temperature
- 🟡 **Warm/Serious** - Warning state
- 🔴 **HOT!/Critical** - High-temperature alert with pulse animation

### Network Stats (SRTLA)
- 📱 **LTE Stats** - Throughput (kbps) and RTT (ms)
- 📶 **WiFi Stats** - Throughput (kbps) and RTT (ms)
- Auto-highlights active interface

## Commands (Browser → Moblin)

| Command | Parameters | Description |
|---------|------------|-------------|
| `set_scene` | `name` | Switch camera scene |
| `set_bitrate` | `kbps` | Adjust stream bitrate |
| `set_zoom` | `level` | Set digital zoom level |
| `go_live` | - | Start streaming |
| `end` | - | Stop streaming |
| `toggle_mic` | - | Toggle microphone |
| `toggle_torch` | - | Toggle flashlight |
| `snapshot` | - | Capture frame |
| `toggle_recording` | - | Toggle local recording |

## Status Updates (Moblin → Browser)

| Type | Fields | Description |
|------|--------|-------------|
| `stream_info` | `bitrate, fps, battery, viewers, thermal_state, upload_stats` | Live stats |
| `scene_changed` | `scene` | Active scene confirmation |
| `stream_started` | - | Stream is live |
| `stream_ended` | - | Stream has ended |
| `thermal_update` | `thermal_state` | Device temperature update |
| `upload_stats` | `lte{kbps,rtt}, wifi{kbps,rtt}` | Network interface stats |
| `obs_connected` | - | OBS WebSocket connected |
| `obs_disconnected` | - | OBS WebSocket disconnected |

## Development

### Frontend Only
Simply open `web/index.html` in your browser.

### With Backend
```bash
# Terminal 1: Start relay
cd relay && go run main.go

# Open http://localhost:8080 in browser
```

### Build for Production
```bash
cd relay
go build -o relay.exe
```

## License

MIT © VolleyBratans
