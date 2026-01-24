/**
 * Moblin Multi-Remote Control - Application Logic
 * Multi-Device WebSocket Connection Manager & Command Center
 * 
 * Architecture:
 * - EventLogger: Centralized event logging system
 * - DeviceConnection: Single device state & WebSocket
 * - DeviceRegistry: Multi-connection orchestration
 * - UIController: Dashboard & Master Control rendering
 * - MoblinMultiRemote: Main application orchestrator
 */

// ============================================
// EventLogger - Centralized Event Logging
// ============================================
class EventLogger {
    constructor(options = {}) {
        this.maxEntries = options.maxEntries || 500;
        this.storageKey = 'moblin_event_log';
        this.logs = this.loadFromStorage();
        this.listeners = [];
        this.filterCategory = 'all';
        this.filterDevice = 'all';

        // Event Categories
        this.categories = {
            connection: { icon: 'link', color: 'var(--primary)' },
            stream: { icon: 'broadcast', color: 'var(--error)' },
            command: { icon: 'terminal', color: 'var(--warning)' },
            error: { icon: 'alert', color: 'var(--error)' },
            system: { icon: 'settings', color: 'var(--text-muted)' },
            stats: { icon: 'chart', color: 'var(--success)' }
        };
    }

    // Core logging method
    log(category, deviceName, message, data = null) {
        const entry = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            category,
            deviceName: deviceName || 'System',
            message,
            data
        };

        this.logs.unshift(entry);

        // Trim to max entries
        if (this.logs.length > this.maxEntries) {
            this.logs = this.logs.slice(0, this.maxEntries);
        }

        this.saveToStorage();
        this.notifyListeners(entry);

        // Also console log for debugging
        const timeStr = new Date().toLocaleTimeString('de-DE');
        console.log(`[${timeStr}] [${category.toUpperCase()}] ${deviceName}: ${message}`, data || '');

        return entry;
    }

    // Convenience methods for each category
    connection(deviceName, message, data) {
        return this.log('connection', deviceName, message, data);
    }

    stream(deviceName, message, data) {
        return this.log('stream', deviceName, message, data);
    }

    command(deviceName, message, data) {
        return this.log('command', deviceName, message, data);
    }

    error(deviceName, message, data) {
        return this.log('error', deviceName, message, data);
    }

    system(message, data) {
        return this.log('system', 'System', message, data);
    }

    stats(deviceName, message, data) {
        return this.log('stats', deviceName, message, data);
    }

    // Get filtered logs
    getFilteredLogs() {
        return this.logs.filter(entry => {
            const categoryMatch = this.filterCategory === 'all' || entry.category === this.filterCategory;
            const deviceMatch = this.filterDevice === 'all' || entry.deviceName === this.filterDevice;
            return categoryMatch && deviceMatch;
        });
    }

    // Get all unique device names
    getDeviceNames() {
        const names = new Set();
        this.logs.forEach(entry => names.add(entry.deviceName));
        return Array.from(names);
    }

    // Clear all logs
    clear() {
        this.logs = [];
        this.saveToStorage();
        this.notifyListeners(null, true);
        this.system('Event log cleared');
    }

    // Export logs as JSON
    exportJSON() {
        const data = {
            exportedAt: new Date().toISOString(),
            totalEntries: this.logs.length,
            logs: this.logs
        };
        return JSON.stringify(data, null, 2);
    }

    // Export logs as CSV
    exportCSV() {
        const headers = ['Timestamp', 'Category', 'Device', 'Message'];
        const rows = this.logs.map(entry => [
            entry.timestamp,
            entry.category,
            entry.deviceName,
            `"${entry.message.replace(/"/g, '""')}"`
        ]);
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    // Download export file
    download(format = 'json') {
        const content = format === 'csv' ? this.exportCSV() : this.exportJSON();
        const filename = `moblin-logs-${new Date().toISOString().split('T')[0]}.${format}`;
        const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.system(`Logs exported as ${format.toUpperCase()}`);
    }

    // Persistence
    saveToStorage() {
        try {
            sessionStorage.setItem(this.storageKey, JSON.stringify(this.logs));
        } catch (e) {
            console.warn('Failed to save logs to storage:', e);
        }
    }

    loadFromStorage() {
        try {
            const stored = sessionStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    // Listener pattern for UI updates
    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    notifyListeners(entry, cleared = false) {
        this.listeners.forEach(callback => callback(entry, cleared));
    }

    // Get stats summary
    getStats() {
        const stats = {
            total: this.logs.length,
            byCategory: {},
            byDevice: {},
            errors: 0,
            lastHour: 0
        };

        const oneHourAgo = Date.now() - (60 * 60 * 1000);

        this.logs.forEach(entry => {
            // By category
            stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;

            // By device
            stats.byDevice[entry.deviceName] = (stats.byDevice[entry.deviceName] || 0) + 1;

            // Error count
            if (entry.category === 'error') stats.errors++;

            // Last hour
            if (new Date(entry.timestamp).getTime() > oneHourAgo) stats.lastHour++;
        });

        return stats;
    }
}

// Global logger instance
const eventLogger = new EventLogger();

// ============================================
// AnalyticsEngine - Real-time Metrics & Graphs
// ============================================
class AnalyticsEngine {
    constructor(maxHistory = 60) {
        this.maxHistory = maxHistory; // 60 seconds of history
        this.data = new Map(); // Map<deviceId, { bitrate: [], fps: [], rtt: [], battery: [] }>
    }

    initDevice(deviceId) {
        if (!this.data.has(deviceId)) {
            this.data.set(deviceId, {
                bitrate: [],
                fps: [],
                rtt: [],
                battery: []
            });
        }
    }

    addSample(deviceId, type, value) {
        if (!this.data.has(deviceId)) this.initDevice(deviceId);

        const deviceData = this.data.get(deviceId);
        if (!deviceData[type]) return;

        const sample = { t: Date.now(), v: value };
        deviceData[type].push(sample);

        // Trim history
        if (deviceData[type].length > this.maxHistory) {
            deviceData[type].shift();
        }
    }

    getHistory(deviceId, type) {
        if (!this.data.has(deviceId)) return [];
        return this.data.get(deviceId)[type] || [];
    }

    // Helper to generate SVG Path for sparklines
    getSparklinePath(data, width, height) {
        if (!data || data.length < 2) return '';

        const min = Math.min(...data.map(d => d.v), 0);
        const max = Math.max(...data.map(d => d.v), 1); // Avoid div by zero
        const range = max - min || 1;

        // X scale: map index to width
        const stepX = width / (this.maxHistory - 1);

        const points = data.map((d, i) => {
            const x = (this.maxHistory - data.length + i) * stepX;
            const y = height - ((d.v - min) / range) * height;
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    }
}

const analytics = new AnalyticsEngine();

// ============================================
// DeviceConnection - Single Device State
// ============================================
class DeviceConnection {
    constructor(profile, onStateChange) {
        this.id = profile.id;
        this.profile = profile;
        this.ws = null;
        this.onStateChange = onStateChange;

        // Initialize analytics buffer
        analytics.initDevice(this.id);

        // Device State
        this.state = {
            isConnected: false,
            isConnecting: false,
            isLive: false,
            isRecording: false,
            isMicMuted: false,
            isTorchOn: false,
            bitrate: null,
            fps: null,
            battery: null,
            viewers: null,
            thermalState: 'fair',
            uploadStats: { lte: null, wifi: null },
            currentScene: null,
            obsConnected: false
        };

        eventLogger.system(`Device registered: ${profile.name}`);
    }

    connect() {
        if (this.state.isConnected || this.state.isConnecting) return;

        this.updateState({ isConnecting: true });
        eventLogger.connection(this.profile.name, 'Connecting...', { url: this.profile.url });

        try {
            this.ws = new WebSocket(this.profile.url);

            this.ws.onopen = () => {
                eventLogger.connection(this.profile.name, 'Connected successfully');

                if (this.profile.password) {
                    this.ws.send(JSON.stringify({
                        type: 'auth',
                        password: this.profile.password
                    }));
                    eventLogger.connection(this.profile.name, 'Authentication sent');
                }

                this.updateState({ isConnected: true, isConnecting: false });
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onclose = () => {
                eventLogger.connection(this.profile.name, 'Connection closed');
                this.updateState({
                    isConnected: false,
                    isConnecting: false,
                    isLive: false
                });
            };

            this.ws.onerror = (error) => {
                eventLogger.error(this.profile.name, 'WebSocket error', { error: error.message || 'Unknown error' });
                this.updateState({ isConnected: false, isConnecting: false });
            };

        } catch (error) {
            eventLogger.error(this.profile.name, 'Connection failed', { error: error.message });
            this.updateState({ isConnected: false, isConnecting: false });
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        eventLogger.connection(this.profile.name, 'Disconnected manually');
        this.updateState({
            isConnected: false,
            isConnecting: false,
            isLive: false
        });
    }

    sendCommand(type, params = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            eventLogger.error(this.profile.name, `Command failed: ${type} (not connected)`);
            return false;
        }

        const message = { type, ...params };
        eventLogger.command(this.profile.name, `Sent: ${type}`, params);
        this.ws.send(JSON.stringify(message));
        return true;
    }

    handleMessage(data) {
        switch (data.type) {
            case 'status':
            case 'stream_info':
                const stateUpdate = {};
                if (data.bitrate !== undefined) {
                    stateUpdate.bitrate = data.bitrate;
                    analytics.addSample(this.id, 'bitrate', data.bitrate);
                }
                if (data.fps !== undefined) {
                    stateUpdate.fps = data.fps;
                    analytics.addSample(this.id, 'fps', data.fps);
                }
                if (data.battery !== undefined) {
                    stateUpdate.battery = data.battery;
                    analytics.addSample(this.id, 'battery', data.battery);
                }
                if (data.viewers !== undefined) stateUpdate.viewers = data.viewers;
                if (data.thermal_state) {
                    stateUpdate.thermalState = data.thermal_state;
                    const thermalMap = { fair: 0, nominal: 1, serious: 2, critical: 3 };
                    analytics.addSample(this.id, 'thermal', thermalMap[data.thermal_state] || 0);
                }
                if (data.upload_stats) {
                    stateUpdate.uploadStats = data.upload_stats;
                    if (data.upload_stats.lte?.rtt) analytics.addSample(this.id, 'rtt', data.upload_stats.lte.rtt);
                    else if (data.upload_stats.wifi?.rtt) analytics.addSample(this.id, 'rtt', data.upload_stats.wifi.rtt);
                }

                // Log significant stats changes periodically (every 30 seconds or on significant change)
                if (data.bitrate !== undefined) {
                    eventLogger.stats(this.profile.name, `Bitrate: ${data.bitrate} kbps, FPS: ${data.fps || '--'}, Battery: ${data.battery || '--'}%`);
                }
                this.updateState(stateUpdate);
                break;

            case 'scene_changed':
                eventLogger.stream(this.profile.name, `Scene changed to: ${data.scene}`);
                this.updateState({ currentScene: data.scene });
                break;

            case 'stream_started':
                eventLogger.stream(this.profile.name, 'Stream STARTED - LIVE');
                this.updateState({ isLive: true });
                break;

            case 'stream_ended':
                eventLogger.stream(this.profile.name, 'Stream ENDED');
                this.updateState({ isLive: false });
                break;

            case 'thermal_update':
                const thermalLabels = { fair: 'Cool', nominal: 'Normal', serious: 'Warm', critical: 'HOT!' };
                const thermalMapUpdate = { fair: 0, nominal: 1, serious: 2, critical: 3 };
                eventLogger.stats(this.profile.name, `Thermal: ${thermalLabels[data.thermal_state] || data.thermal_state}`);
                analytics.addSample(this.id, 'thermal', thermalMapUpdate[data.thermal_state] || 0);
                this.updateState({ thermalState: data.thermal_state });
                break;

            case 'upload_stats':
                this.updateState({ uploadStats: data.upload_stats });
                if (data.upload_stats.lte?.rtt) analytics.addSample(this.id, 'rtt', data.upload_stats.lte.rtt);
                else if (data.upload_stats.wifi?.rtt) analytics.addSample(this.id, 'rtt', data.upload_stats.wifi.rtt);
                break;

            case 'recording_state':
                eventLogger.stream(this.profile.name, data.recording ? 'Recording STARTED' : 'Recording STOPPED');
                this.updateState({ isRecording: data.recording });
                break;

            case 'mic_state':
                eventLogger.command(this.profile.name, data.muted ? 'Mic MUTED' : 'Mic UNMUTED');
                this.updateState({ isMicMuted: data.muted });
                break;

            case 'torch_state':
                eventLogger.command(this.profile.name, data.enabled ? 'Torch ON' : 'Torch OFF');
                this.updateState({ isTorchOn: data.enabled });
                break;

            case 'obs_connected':
                eventLogger.connection(this.profile.name, 'OBS WebSocket connected');
                this.updateState({ obsConnected: true });
                break;

            case 'obs_disconnected':
                eventLogger.connection(this.profile.name, 'OBS WebSocket disconnected');
                this.updateState({ obsConnected: false });
                break;

            case 'error':
                eventLogger.error(this.profile.name, `Server error: ${data.message}`);
                break;
        }
    }

    updateState(partialState) {
        this.state = { ...this.state, ...partialState };
        if (this.onStateChange) {
            this.onStateChange(this.id, this.state);
        }
    }

    getState() {
        return { ...this.state };
    }
}

// ============================================
// DeviceRegistry - Multi-Connection Manager
// ============================================
class DeviceRegistry {
    constructor(onUpdate) {
        this.devices = new Map();
        this.onUpdate = onUpdate;
    }

    addDevice(profile) {
        if (this.devices.has(profile.id)) {
            return this.devices.get(profile.id);
        }

        const device = new DeviceConnection(profile, (id, state) => {
            if (this.onUpdate) {
                this.onUpdate(id, state);
            }
        });

        this.devices.set(profile.id, device);
        return device;
    }

    removeDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (device) {
            device.disconnect();
            this.devices.delete(deviceId);
        }
    }

    getDevice(deviceId) {
        return this.devices.get(deviceId);
    }

    getAllDevices() {
        return this.devices;
    }

    getConnectedDevices() {
        const connected = new Map();
        this.devices.forEach((device, id) => {
            if (device.state.isConnected) {
                connected.set(id, device);
            }
        });
        return connected;
    }

    getDeviceCount() {
        return this.devices.size;
    }

    getConnectedCount() {
        let count = 0;
        this.devices.forEach(device => {
            if (device.state.isConnected) count++;
        });
        return count;
    }

    getLiveCount() {
        let count = 0;
        this.devices.forEach(device => {
            if (device.state.isLive) count++;
        });
        return count;
    }

    broadcastCommand(type, params = {}) {
        eventLogger.system(`Broadcasting ${type} to all connected devices`, params);
        const results = [];
        this.devices.forEach((device, id) => {
            if (device.state.isConnected) {
                const success = device.sendCommand(type, params);
                results.push({ id, success });
            }
        });
        return results;
    }

    connectAll() {
        this.devices.forEach(device => {
            if (!device.state.isConnected && !device.state.isConnecting) {
                device.connect();
            }
        });
    }

    disconnectAll() {
        this.devices.forEach(device => device.disconnect());
    }
}

// ============================================
// UIController - Multi-Device Dashboard
// ============================================
class UIController {
    constructor(registry) {
        this.registry = registry;
        this.currentView = 'single'; // 'single' or 'multi'
        this.selectedDeviceId = null;

        // Cache DOM elements
        this.elements = {
            // View Toggle
            viewToggle: document.getElementById('viewToggle'),

            // Hero
            heroSection: document.getElementById('heroSection'),

            // Profile
            profileBtn: document.getElementById('profileBtn'),
            profileDropdown: document.getElementById('profileDropdown'),
            profileList: document.getElementById('profileList'),
            profileName: document.getElementById('profileName'),
            addProfileBtn: document.getElementById('addProfileBtn'),

            // Connection (Single Device)
            statusDot: document.getElementById('statusDot'),
            statusIcon: document.getElementById('statusIcon'),
            statusText: document.getElementById('statusText'),
            connectBtn: document.getElementById('connectBtn'),

            // Single Device Controls
            controlsSection: document.getElementById('controlsSection'),
            sceneGrid: document.getElementById('sceneGrid'),
            bitrateSlider: document.getElementById('bitrateSlider'),
            bitrateValue: document.getElementById('bitrateValue'),
            zoomSlider: document.getElementById('zoomSlider'),
            zoomValue: document.getElementById('zoomValue'),
            goLiveBtn: document.getElementById('goLiveBtn'),
            endStreamBtn: document.getElementById('endStreamBtn'),

            // Stats
            statBitrate: document.getElementById('statBitrate'),
            statFps: document.getElementById('statFps'),
            statBattery: document.getElementById('statBattery'),
            statViewers: document.getElementById('statViewers'),

            // Thermal
            thermalCard: document.getElementById('thermalCard'),
            thermalValue: document.getElementById('thermalValue'),

            // Network Stats
            lteKbps: document.getElementById('lteKbps'),
            lteRtt: document.getElementById('lteRtt'),
            wifiKbps: document.getElementById('wifiKbps'),
            wifiRtt: document.getElementById('wifiRtt'),

            // Quick Actions
            quickActionsGrid: document.getElementById('quickActionsGrid'),
            micBtn: document.getElementById('micBtn'),
            torchBtn: document.getElementById('torchBtn'),
            recordBtn: document.getElementById('recordBtn'),

            // OBS Status
            obsStatusDot: document.getElementById('obsStatusDot'),
            obsStatusText: document.getElementById('obsStatusText'),

            // Multi-Device
            masterControlBar: document.getElementById('masterControlBar'),
            masterDeviceCount: document.getElementById('masterDeviceCount'),
            masterLiveCount: document.getElementById('masterLiveCount'),
            deviceGridSection: document.getElementById('deviceGridSection'),
            deviceGrid: document.getElementById('deviceGrid'),

            // Master Actions
            masterRecordAll: document.getElementById('masterRecordAll'),
            masterGoLiveAll: document.getElementById('masterGoLiveAll'),
            masterEndAll: document.getElementById('masterEndAll'),
            masterSyncScene: document.getElementById('masterSyncScene'),
            masterMuteAll: document.getElementById('masterMuteAll'),

            // Modal
            modalOverlay: document.getElementById('modalOverlay'),
            newProfileName: document.getElementById('newProfileName'),
            newProfileUrl: document.getElementById('newProfileUrl'),
            newProfilePassword: document.getElementById('newProfilePassword'),
            saveProfileBtn: document.getElementById('saveProfileBtn'),
            cancelModalBtn: document.getElementById('cancelModalBtn'),

            // Log Panel
            logPanelToggle: document.getElementById('logPanelToggle'),
            logPanel: document.getElementById('logPanel'),
            logPanelClose: document.getElementById('logPanelClose'),
            logList: document.getElementById('logList'),
            logFilterCategory: document.getElementById('logFilterCategory'),
            logFilterDevice: document.getElementById('logFilterDevice'),
            logClearBtn: document.getElementById('logClearBtn'),
            logExportBtn: document.getElementById('logExportBtn'),
            logCount: document.getElementById('logCount'),
            logBadge: document.getElementById('logBadge'),

            // QR Code Modal
            qrConnectBtn: document.getElementById('qrConnectBtn'),
            qrModalOverlay: document.getElementById('qrModalOverlay'),
            qrModalClose: document.getElementById('qrModalClose'),
            qrRelayPassword: document.getElementById('qrRelayPassword'),
            qrRelayUrl: document.getElementById('qrRelayUrl'),
            qrGenerateBtn: document.getElementById('qrGenerateBtn'),
            qrCodeContainer: document.getElementById('qrCodeContainer'),
            qrStep1: document.getElementById('qrStep1'),
            qrStep2: document.getElementById('qrStep2'),
            qrResetBtn: document.getElementById('qrResetBtn'),
        };

        this.logPanelOpen = false;
        this.unreadLogCount = 0;

        // Set up log listener
        eventLogger.addListener((entry, cleared) => {
            this.onLogEntry(entry, cleared);
        });
    }

    setView(view) {
        this.currentView = view;

        if (view === 'multi') {
            this.elements.heroSection?.classList.add('hidden');
            this.elements.controlsSection?.classList.add('hidden');
            this.elements.masterControlBar?.classList.remove('hidden');
            this.elements.deviceGridSection?.classList.remove('hidden');
            this.renderDeviceGrid();
        } else {
            this.elements.masterControlBar?.classList.add('hidden');
            this.elements.deviceGridSection?.classList.add('hidden');

            // Show single device view based on connection state
            if (this.selectedDeviceId) {
                const device = this.registry.getDevice(this.selectedDeviceId);
                if (device?.state.isConnected) {
                    this.elements.heroSection?.classList.add('hidden');
                    this.elements.controlsSection?.classList.remove('hidden');
                } else {
                    this.elements.heroSection?.classList.remove('hidden');
                    this.elements.controlsSection?.classList.add('hidden');
                }
            } else {
                this.elements.heroSection?.classList.remove('hidden');
                this.elements.controlsSection?.classList.add('hidden');
            }
        }

        this.updateViewToggle();
    }

    updateViewToggle() {
        if (!this.elements.viewToggle) return;

        this.elements.viewToggle.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentView);
        });
    }

    renderDeviceGrid() {
        if (!this.elements.deviceGrid) return;

        const devices = this.registry.getAllDevices();

        if (devices.size === 0) {
            this.elements.deviceGrid.innerHTML = `
                <div class="no-devices-message">
                    <p>No devices added. Add a profile to get started.</p>
                </div>
            `;
            return;
        }

        let html = '';
        devices.forEach((device, id) => {
            html += this.renderDeviceCard(device);
        });

        this.elements.deviceGrid.innerHTML = html;
        this.updateMasterControlBar();
    }

    renderDeviceCard(device) {
        const state = device.getState();
        const profile = device.profile;

        const statusClass = state.isConnected ? 'connected' : (state.isConnecting ? 'connecting' : 'disconnected');
        const thermalClass = this.getThermalClass(state.thermalState);

        return `
            <div class="device-card ${statusClass}" data-device-id="${device.id}">
                <div class="device-card-header">
                    <div class="device-info">
                        <span class="device-name">${this.escapeHtml(profile.name)}</span>
                        <span class="device-status-badge ${statusClass}">
                            <span class="device-status-dot"></span>
                            ${state.isConnected ? 'Connected' : (state.isConnecting ? 'Connecting...' : 'Disconnected')}
                        </span>
                    </div>
                    ${state.isLive ? '<span class="device-live-badge">LIVE</span>' : ''}
                </div>
                
                <div class="device-mini-stats">
                    <div class="device-stat">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                        <span>${state.bitrate ? state.bitrate + ' kbps' : '--'}</span>
                    </div>
                    <div class="device-stat">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="7" width="18" height="12" rx="2"/>
                            <path d="M22 11v4"/>
                        </svg>
                        <span>${state.battery ? state.battery + '%' : '--'}</span>
                    </div>
                    <div class="device-stat ${thermalClass}">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>
                        </svg>
                        <span>${this.getThermalLabel(state.thermalState)}</span>
                    </div>
                </div>
                
                <div class="device-quick-actions">
                    <button class="device-action-btn ${state.isMicMuted ? '' : 'active'}" data-action="toggle_mic" data-device-id="${device.id}" title="Toggle Mic">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>
                        </svg>
                    </button>
                    <button class="device-action-btn ${state.isRecording ? 'recording' : ''}" data-action="toggle_recording" data-device-id="${device.id}" title="Toggle Recording">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="4" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="device-action-btn" data-action="details" data-device-id="${device.id}" title="Show Graphs">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="20" x2="18" y2="10"/>
                            <line x1="12" y1="20" x2="12" y2="4"/>
                            <line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                    </button>
                    <button class="device-action-btn device-connect-btn" data-action="${state.isConnected ? 'disconnect' : 'connect'}" data-device-id="${device.id}">
                        ${state.isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                </div>

                <!-- Visual Analytics Section (Hidden by default) -->
                <div class="device-analytics hidden" id="analytics-${device.id}">
                    <div class="analytics-row">
                        <div class="analytics-label">Bitrate</div>
                        <div class="sparkline-container">
                            <svg class="sparkline" preserveAspectRatio="none" viewBox="0 0 100 20">
                                <path class="sparkline-path path-bitrate" d="${analytics.getSparklinePath(analytics.getHistory(device.id, 'bitrate'), 100, 20)}" stroke-width="1.5" vector-effect="non-scaling-stroke"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="analytics-row">
                        <div class="analytics-label">FPS</div>
                        <div class="sparkline-container">
                            <svg class="sparkline" preserveAspectRatio="none" viewBox="0 0 100 20">
                                <path class="sparkline-path path-fps" d="${analytics.getSparklinePath(analytics.getHistory(device.id, 'fps'), 100, 20)}" stroke-width="1.5" vector-effect="non-scaling-stroke"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="analytics-row">
                        <div class="analytics-label">Battery</div>
                        <div class="sparkline-container">
                            <svg class="sparkline" preserveAspectRatio="none" viewBox="0 0 100 20">
                                <path class="sparkline-path path-battery" d="${analytics.getSparklinePath(analytics.getHistory(device.id, 'battery'), 100, 20)}" stroke-width="1.5" vector-effect="non-scaling-stroke"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateDeviceCard(deviceId) {
        const device = this.registry.getDevice(deviceId);
        if (!device) return;

        const existingCard = document.querySelector(`.device-card[data-device-id="${deviceId}"]`);
        if (existingCard) {
            // Check if analytics panel is open
            const analyticsPanel = existingCard.querySelector(`#analytics-${deviceId}`);
            const wasOpen = analyticsPanel && !analyticsPanel.classList.contains('hidden');

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.renderDeviceCard(device);
            existingCard.replaceWith(tempDiv.firstElementChild);

            // Restore state
            if (wasOpen) {
                const newCard = document.querySelector(`.device-card[data-device-id="${deviceId}"]`);
                if (newCard) {
                    newCard.querySelector(`#analytics-${deviceId}`).classList.remove('hidden');
                    newCard.querySelector('button[data-action="details"]').classList.add('active');
                }
            }
        } else {
            // No card yet? If in multi-view, maybe full redraw is better, but this method assumes update
            this.updateMasterControlBar();
        }

        this.updateMasterControlBar();
    }

    updateMasterControlBar() {
        if (!this.elements.masterDeviceCount) return;

        const connectedCount = this.registry.getConnectedCount();
        const liveCount = this.registry.getLiveCount();

        this.elements.masterDeviceCount.textContent = `${connectedCount} Device${connectedCount !== 1 ? 's' : ''} Connected`;

        if (this.elements.masterLiveCount) {
            this.elements.masterLiveCount.textContent = `${liveCount} Live`;
            this.elements.masterLiveCount.classList.toggle('hidden', liveCount === 0);
        }

        // Toggle End All visibility based on live count
        if (this.elements.masterEndAll) {
            this.elements.masterEndAll.classList.toggle('hidden', liveCount === 0);
        }
        if (this.elements.masterGoLiveAll) {
            this.elements.masterGoLiveAll.classList.toggle('hidden', liveCount > 0);
        }
    }

    // Single Device UI Updates (legacy compatibility)
    updateConnectionStatus(status, deviceId = null) {
        if (this.currentView === 'multi' && deviceId) {
            this.updateDeviceCard(deviceId);
            return;
        }

        const isConnected = status === 'connected';

        this.elements.statusDot.className = 'status-dot';
        this.elements.statusDot.classList.add(`status-${status}`);

        this.elements.statusText.className = 'status-text';
        this.elements.statusText.classList.add(`status-text-${status}`);

        const statusLabels = {
            connected: 'Connected',
            connecting: 'Connecting...',
            disconnected: 'Disconnected'
        };
        this.elements.statusText.textContent = statusLabels[status];

        this.elements.connectBtn.textContent = isConnected ? 'Disconnect' : 'Connect';
        this.elements.connectBtn.disabled = status === 'connecting';

        // Update status icon
        if (status === 'connected') {
            this.elements.statusIcon.innerHTML = `
                <path d="M5 12.859a10 10 0 0 1 14 0"/>
                <path d="M8.5 16.429a5 5 0 0 1 7 0"/>
                <path d="M2 8.82a15 15 0 0 1 20 0"/>
                <circle cx="12" cy="20" r="1"/>
            `;
        } else {
            this.elements.statusIcon.innerHTML = `
                <path d="M12 20h.01"/>
                <path d="M8.5 16.429a5 5 0 0 1 7 0"/>
                <path d="M5 12.859a10 10 0 0 1 5.17-2.69"/>
                <path d="M19 12.859a10 10 0 0 0-2.007-1.523"/>
                <path d="M2 8.82a15 15 0 0 1 4.177-2.643"/>
                <path d="M22 8.82a15 15 0 0 0-11.288-3.764"/>
                <path d="m2 2 20 20"/>
            `;
        }
    }

    updateStats(state) {
        if (state.bitrate !== undefined && this.elements.statBitrate) {
            this.elements.statBitrate.textContent = `${state.bitrate} kbps`;
        }
        if (state.fps !== undefined && this.elements.statFps) {
            this.elements.statFps.textContent = state.fps;
        }
        if (state.battery !== undefined && this.elements.statBattery) {
            this.elements.statBattery.textContent = `${state.battery}%`;
        }
        if (state.viewers !== undefined && this.elements.statViewers) {
            this.elements.statViewers.textContent = state.viewers;
        }
    }

    updateThermalState(state) {
        const stateConfig = {
            fair: { text: 'Cool', class: 'thermal-fair' },
            nominal: { text: 'Normal', class: 'thermal-fair' },
            serious: { text: 'Warm', class: 'thermal-serious' },
            critical: { text: 'HOT!', class: 'thermal-critical' }
        };

        const config = stateConfig[state] || stateConfig.fair;
        if (this.elements.thermalValue) {
            this.elements.thermalValue.textContent = config.text;
        }
        if (this.elements.thermalCard) {
            this.elements.thermalCard.className = `thermal-card ${config.class}`;
        }
    }

    updateUploadStats(stats) {
        if (stats.lte) {
            if (this.elements.lteKbps) this.elements.lteKbps.textContent = `${stats.lte.kbps} kbps`;
            if (this.elements.lteRtt) this.elements.lteRtt.textContent = `RTT: ${stats.lte.rtt}ms`;
            document.getElementById('lteStats')?.classList.toggle('active', stats.lte.kbps > 0);
        }
        if (stats.wifi) {
            if (this.elements.wifiKbps) this.elements.wifiKbps.textContent = `${stats.wifi.kbps} kbps`;
            if (this.elements.wifiRtt) this.elements.wifiRtt.textContent = `RTT: ${stats.wifi.rtt}ms`;
            document.getElementById('wifiStats')?.classList.toggle('active', stats.wifi.kbps > 0);
        }
    }

    updateActiveScene(sceneName) {
        this.elements.sceneGrid?.querySelectorAll('.scene-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.scene === sceneName);
        });
    }

    updateLiveState(isLive) {
        this.elements.goLiveBtn?.classList.toggle('hidden', isLive);
        this.elements.endStreamBtn?.classList.toggle('hidden', !isLive);
    }

    updateRecordingState(isRecording) {
        this.elements.recordBtn?.classList.toggle('recording', isRecording);
    }

    updateMicState(isMuted) {
        this.elements.micBtn?.classList.toggle('active', !isMuted);
    }

    updateTorchState(isEnabled) {
        this.elements.torchBtn?.classList.toggle('active', isEnabled);
    }

    updateObsStatus(isConnected) {
        if (this.elements.obsStatusDot) {
            this.elements.obsStatusDot.classList.remove('obs-status-connected', 'obs-status-disconnected');
            this.elements.obsStatusDot.classList.add(isConnected ? 'obs-status-connected' : 'obs-status-disconnected');
        }
        if (this.elements.obsStatusText) {
            this.elements.obsStatusText.textContent = isConnected ? 'OBS' : 'OBS';
        }
    }

    showControls() {
        this.elements.heroSection?.classList.add('hidden');
        this.elements.controlsSection?.classList.remove('hidden');
    }

    hideControls() {
        this.elements.heroSection?.classList.remove('hidden');
        this.elements.controlsSection?.classList.add('hidden');
    }

    // Helpers
    getThermalClass(state) {
        const classes = {
            fair: 'thermal-fair',
            nominal: 'thermal-fair',
            serious: 'thermal-serious',
            critical: 'thermal-critical'
        };
        return classes[state] || 'thermal-fair';
    }

    getThermalLabel(state) {
        const labels = {
            fair: 'Cool',
            nominal: 'Normal',
            serious: 'Warm',
            critical: 'HOT!'
        };
        return labels[state] || 'Cool';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // Log Panel Methods
    // ============================================

    onLogEntry(entry, cleared) {
        if (cleared) {
            this.renderLogList();
            this.unreadLogCount = 0;
            this.updateLogBadge();
            return;
        }

        if (!this.logPanelOpen) {
            this.unreadLogCount++;
            this.updateLogBadge();
        }

        // Add new entry to top of list if panel exists
        if (this.elements.logList && entry) {
            const entryHtml = this.renderLogEntry(entry);
            this.elements.logList.insertAdjacentHTML('afterbegin', entryHtml);

            // Limit displayed entries to prevent performance issues
            const entries = this.elements.logList.querySelectorAll('.log-entry');
            if (entries.length > 100) {
                entries[entries.length - 1].remove();
            }
        }

        // Update count
        if (this.elements.logCount) {
            this.elements.logCount.textContent = `${eventLogger.logs.length} events`;
        }
    }

    toggleLogPanel() {
        this.logPanelOpen = !this.logPanelOpen;

        if (this.elements.logPanel) {
            this.elements.logPanel.classList.toggle('open', this.logPanelOpen);
        }

        if (this.logPanelOpen) {
            this.unreadLogCount = 0;
            this.updateLogBadge();
            this.renderLogList();
            this.updateLogFilters();
        }
    }

    renderLogList() {
        if (!this.elements.logList) return;

        const logs = eventLogger.getFilteredLogs().slice(0, 100);

        if (logs.length === 0) {
            this.elements.logList.innerHTML = `
                <div class="log-empty">
                    <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <p>No events logged yet</p>
                </div>
            `;
            return;
        }

        this.elements.logList.innerHTML = logs.map(entry => this.renderLogEntry(entry)).join('');

        if (this.elements.logCount) {
            this.elements.logCount.textContent = `${eventLogger.logs.length} events`;
        }
    }

    renderLogEntry(entry) {
        const categoryConfig = eventLogger.categories[entry.category] || { icon: 'info', color: 'var(--text-muted)' };
        const time = this.formatLogTime(entry.timestamp);

        return `
            <div class="log-entry log-${entry.category}">
                <div class="log-entry-icon" style="color: ${categoryConfig.color}">
                    ${this.getCategoryIcon(entry.category)}
                </div>
                <div class="log-entry-content">
                    <div class="log-entry-header">
                        <span class="log-entry-device">${this.escapeHtml(entry.deviceName)}</span>
                        <span class="log-entry-time">${time}</span>
                    </div>
                    <div class="log-entry-message">${this.escapeHtml(entry.message)}</div>
                </div>
            </div>
        `;
    }

    updateLogFilters() {
        // Update device filter dropdown
        if (this.elements.logFilterDevice) {
            const devices = eventLogger.getDeviceNames();
            const currentValue = this.elements.logFilterDevice.value;

            this.elements.logFilterDevice.innerHTML = `
                <option value="all">All Devices</option>
                ${devices.map(d => `<option value="${this.escapeHtml(d)}" ${d === currentValue ? 'selected' : ''}>${this.escapeHtml(d)}</option>`).join('')}
            `;
        }
    }

    updateLogBadge() {
        if (this.elements.logBadge) {
            if (this.unreadLogCount > 0) {
                this.elements.logBadge.textContent = this.unreadLogCount > 99 ? '99+' : this.unreadLogCount;
                this.elements.logBadge.classList.remove('hidden');
            } else {
                this.elements.logBadge.classList.add('hidden');
            }
        }
    }

    formatLogTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    getCategoryIcon(category) {
        const icons = {
            connection: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>`,
            stream: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="4" fill="currentColor"/>
            </svg>`,
            command: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
            </svg>`,
            error: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>`,
            system: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>`,
            stats: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>`
        };
        return icons[category] || icons.system;
    }
}

// ============================================
// MoblinMultiRemote - Main Application
// ============================================
class MoblinMultiRemote {
    constructor() {
        this.profiles = this.loadProfiles();
        this.currentProfile = null;

        // Initialize Registry & UI
        this.registry = new DeviceRegistry((deviceId, state) => {
            this.onDeviceStateChange(deviceId, state);
        });

        this.ui = new UIController(this.registry);

        this.init();
    }

    init() {
        this.bindEvents();
        this.renderProfiles();
        this.ui.updateConnectionStatus('disconnected');

        // Initialize devices from profiles
        this.profiles.forEach(profile => {
            this.registry.addDevice(profile);
        });
    }

    bindEvents() {
        // View Toggle
        this.ui.elements.viewToggle?.addEventListener('click', (e) => {
            const btn = e.target.closest('.view-btn');
            if (btn) {
                this.ui.setView(btn.dataset.view);
            }
        });

        // Profile dropdown toggle
        this.ui.elements.profileBtn?.addEventListener('click', () => this.toggleProfileDropdown());

        // Add profile button
        this.ui.elements.addProfileBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showModal();
        });

        // Connect button (single device mode)
        this.ui.elements.connectBtn?.addEventListener('click', () => this.toggleConnection());

        // Scene buttons
        this.ui.elements.sceneGrid?.addEventListener('click', (e) => {
            if (e.target.classList.contains('scene-btn')) {
                this.selectScene(e.target.dataset.scene);
            }
        });

        // Sliders
        this.ui.elements.bitrateSlider?.addEventListener('input', (e) => {
            const value = e.target.value;
            this.ui.elements.bitrateValue.textContent = `${value} kbps`;
            this.sendToSelected('set_bitrate', { kbps: parseInt(value) });
        });

        this.ui.elements.zoomSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value).toFixed(1);
            this.ui.elements.zoomValue.textContent = `${value}x`;
            this.sendToSelected('set_zoom', { level: parseFloat(value) });
        });

        // Quick Actions (single device)
        this.ui.elements.quickActionsGrid?.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-btn');
            if (btn) {
                const action = btn.dataset.action;
                const value = btn.dataset.value;

                if (action === 'set_scene' && value) {
                    this.sendToSelected(action, { name: value });
                } else {
                    this.sendToSelected(action);

                    if (action === 'toggle_mic' || action === 'toggle_torch') {
                        btn.classList.toggle('active');
                    }
                }
            }
        });

        // Stream actions
        this.ui.elements.goLiveBtn?.addEventListener('click', () => this.sendToSelected('go_live'));
        this.ui.elements.endStreamBtn?.addEventListener('click', () => this.sendToSelected('end'));

        // Master Control Actions
        this.ui.elements.masterRecordAll?.addEventListener('click', () => {
            this.registry.broadcastCommand('toggle_recording');
        });

        this.ui.elements.masterGoLiveAll?.addEventListener('click', () => {
            this.registry.broadcastCommand('go_live');
        });

        this.ui.elements.masterEndAll?.addEventListener('click', () => {
            this.registry.broadcastCommand('end');
        });

        this.ui.elements.masterMuteAll?.addEventListener('click', () => {
            this.registry.broadcastCommand('toggle_mic');
        });

        this.ui.elements.masterSyncScene?.addEventListener('click', () => {
            // TODO: Open scene selector modal for sync
            const scene = prompt('Enter scene name to sync:');
            if (scene) {
                this.registry.broadcastCommand('set_scene', { name: scene });
            }
        });

        // Device Grid Actions
        this.ui.elements.deviceGrid?.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                const deviceId = actionBtn.dataset.deviceId;

                if (action === 'connect') {
                    const device = this.registry.getDevice(deviceId);
                    device?.connect();
                } else if (action === 'disconnect') {
                    const device = this.registry.getDevice(deviceId);
                    device?.disconnect();
                } else if (action === 'details') {
                    const card = this.ui.elements.deviceGrid.querySelector(`.device-card[data-device-id="${deviceId}"]`);
                    if (card) {
                        const analyticsPanel = card.querySelector(`#analytics-${deviceId}`);
                        const btn = actionBtn;

                        if (analyticsPanel.classList.contains('hidden')) {
                            analyticsPanel.classList.remove('hidden');
                            btn.classList.add('active');
                        } else {
                            analyticsPanel.classList.add('hidden');
                            btn.classList.remove('active');
                        }
                    }
                } else {
                    const device = this.registry.getDevice(deviceId);
                    device?.sendCommand(action);
                }
            }
        });

        // Modal
        this.ui.elements.saveProfileBtn?.addEventListener('click', () => this.saveProfile());
        this.ui.elements.cancelModalBtn?.addEventListener('click', () => this.hideModal());
        this.ui.elements.modalOverlay?.addEventListener('click', (e) => {
            if (e.target === this.ui.elements.modalOverlay) this.hideModal();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.ui.elements.profileBtn?.contains(e.target) &&
                !this.ui.elements.profileDropdown?.contains(e.target)) {
                this.closeProfileDropdown();
            }
        });

        // Log Panel Events
        this.ui.elements.logPanelToggle?.addEventListener('click', () => {
            this.ui.toggleLogPanel();
        });

        this.ui.elements.logPanelClose?.addEventListener('click', () => {
            this.ui.toggleLogPanel();
        });

        this.ui.elements.logClearBtn?.addEventListener('click', () => {
            eventLogger.clear();
        });

        this.ui.elements.logExportBtn?.addEventListener('click', () => {
            eventLogger.download('json');
        });

        this.ui.elements.logFilterCategory?.addEventListener('change', (e) => {
            eventLogger.filterCategory = e.target.value;
            this.ui.renderLogList();
        });

        this.ui.elements.logFilterDevice?.addEventListener('change', (e) => {
            eventLogger.filterDevice = e.target.value;
            this.ui.renderLogList();
        });

        // Log system startup
        eventLogger.system('Moblin Multi-Remote Control initialized');

        // QR Code Modal Events
        this.bindQrEvents();
    }

    bindQrEvents() {
        // Open Modal
        this.ui.elements.qrConnectBtn?.addEventListener('click', () => {
            if (this.ui.elements.qrModalOverlay) {
                this.ui.elements.qrModalOverlay.classList.remove('hidden');
                // Reset state
                this.resetQrModal();
            }
        });

        // Close Modal
        this.ui.elements.qrModalClose?.addEventListener('click', () => {
            this.ui.elements.qrModalOverlay?.classList.add('hidden');
        });

        // Generate QR
        this.ui.elements.qrGenerateBtn?.addEventListener('click', () => {
            this.generateQrCode();
        });

        // Reset
        this.ui.elements.qrResetBtn?.addEventListener('click', () => {
            this.resetQrModal();
        });

        // Close on overlay click
        this.ui.elements.qrModalOverlay?.addEventListener('click', (e) => {
            if (e.target === this.ui.elements.qrModalOverlay) {
                this.ui.elements.qrModalOverlay.classList.add('hidden');
            }
        });
    }

    resetQrModal() {
        this.ui.elements.qrStep1?.classList.remove('hidden');
        this.ui.elements.qrStep2?.classList.add('hidden');
        if (this.ui.elements.qrCodeContainer) this.ui.elements.qrCodeContainer.innerHTML = '';
        if (this.ui.elements.qrRelayPassword) this.ui.elements.qrRelayPassword.value = '';
    }

    generateQrCode() {
        const password = this.ui.elements.qrRelayPassword?.value.trim();
        const url = this.ui.elements.qrRelayUrl?.value.trim();

        if (!password) {
            alert('Bitte ein Passwort eingeben.');
            return;
        }

        const config = {
            url: url,
            password: password
        };

        // Custom Moblin/OBS Relay format
        // Some apps expect just the JSON.
        const payload = JSON.stringify(config);

        // Clear previous
        if (this.ui.elements.qrCodeContainer) {
            this.ui.elements.qrCodeContainer.innerHTML = '';

            try {
                // Generate
                new QRCode(this.ui.elements.qrCodeContainer, {
                    text: payload,
                    width: 256,
                    height: 256,
                    colorDark: "#e0e0e0", // Light color for dark theme
                    colorLight: "#1e1e1e", // Dark background
                    correctLevel: QRCode.CorrectLevel.H
                });

                // Show step 2
                this.ui.elements.qrStep1?.classList.add('hidden');
                this.ui.elements.qrStep2?.classList.remove('hidden');
            } catch (e) {
                console.error('QR Gen Error:', e);
                alert('Fehler beim Erstellen des QR Codes. Ist die Bibliothek geladen?');
            }
        }
    }

    onDeviceStateChange(deviceId, state) {
        // Update UI based on current view
        if (this.ui.currentView === 'multi') {
            this.ui.updateDeviceCard(deviceId);
        } else if (this.ui.selectedDeviceId === deviceId) {
            // Update single device view
            if (state.isConnected) {
                this.ui.updateConnectionStatus('connected');
                this.ui.showControls();
            } else if (state.isConnecting) {
                this.ui.updateConnectionStatus('connecting');
            } else {
                this.ui.updateConnectionStatus('disconnected');
                this.ui.hideControls();
            }

            this.ui.updateStats(state);
            this.ui.updateThermalState(state.thermalState);
            if (state.uploadStats) this.ui.updateUploadStats(state.uploadStats);
            this.ui.updateLiveState(state.isLive);
            this.ui.updateRecordingState(state.isRecording);
            this.ui.updateMicState(state.isMicMuted);
            this.ui.updateTorchState(state.isTorchOn);
            this.ui.updateObsStatus(state.obsConnected);
            if (state.currentScene) this.ui.updateActiveScene(state.currentScene);
        }
    }

    sendToSelected(type, params = {}) {
        if (this.ui.selectedDeviceId) {
            const device = this.registry.getDevice(this.ui.selectedDeviceId);
            device?.sendCommand(type, params);
        }
    }

    // Profile Management
    loadProfiles() {
        const stored = localStorage.getItem('moblin_profiles');
        return stored ? JSON.parse(stored) : [];
    }

    saveProfiles() {
        localStorage.setItem('moblin_profiles', JSON.stringify(this.profiles));
    }

    renderProfiles() {
        if (this.profiles.length === 0) {
            this.ui.elements.profileList.innerHTML = `
                <p class="no-profiles">No profiles yet. Add one to get started.</p>
            `;
            return;
        }

        this.ui.elements.profileList.innerHTML = this.profiles.map((profile, index) => `
            <div class="profile-item ${this.currentProfile?.id === profile.id ? 'active' : ''}" 
                 data-index="${index}">
                <div>
                    <div class="profile-item-name">${this.ui.escapeHtml(profile.name)}</div>
                    <div class="profile-item-url">${this.ui.escapeHtml(profile.url)}</div>
                </div>
                <button class="delete-profile-btn" data-index="${index}">
                    <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');

        // Bind profile selection
        this.ui.elements.profileList.querySelectorAll('.profile-item').forEach((item, index) => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-profile-btn')) {
                    this.selectProfile(index);
                }
            });
        });

        // Bind delete buttons
        this.ui.elements.profileList.querySelectorAll('.delete-profile-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProfile(parseInt(btn.dataset.index));
            });
        });
    }

    selectProfile(index) {
        this.currentProfile = this.profiles[index];
        this.ui.selectedDeviceId = this.currentProfile.id;
        this.ui.elements.profileName.textContent = this.currentProfile.name;
        this.renderProfiles();
        this.closeProfileDropdown();
    }

    deleteProfile(index) {
        const profile = this.profiles[index];

        // Remove from registry
        this.registry.removeDevice(profile.id);

        if (this.currentProfile?.id === profile.id) {
            this.currentProfile = null;
            this.ui.selectedDeviceId = null;
            this.ui.elements.profileName.textContent = 'No profile selected';
        }

        this.profiles.splice(index, 1);
        this.saveProfiles();
        this.renderProfiles();

        if (this.ui.currentView === 'multi') {
            this.ui.renderDeviceGrid();
        }
    }

    saveProfile() {
        const name = this.ui.elements.newProfileName.value.trim();
        const url = this.ui.elements.newProfileUrl.value.trim();
        const password = this.ui.elements.newProfilePassword.value;

        if (!name || !url) {
            alert('Please enter a name and URL');
            return;
        }

        const profile = {
            id: Date.now().toString(),
            name,
            url,
            password
        };

        this.profiles.push(profile);
        this.saveProfiles();

        // Add to registry
        this.registry.addDevice(profile);

        this.renderProfiles();
        this.hideModal();

        // Auto-select new profile
        this.selectProfile(this.profiles.length - 1);

        if (this.ui.currentView === 'multi') {
            this.ui.renderDeviceGrid();
        }
    }

    toggleProfileDropdown() {
        const isOpen = this.ui.elements.profileDropdown?.classList.contains('open');
        if (isOpen) {
            this.closeProfileDropdown();
        } else {
            this.openProfileDropdown();
        }
    }

    openProfileDropdown() {
        this.ui.elements.profileDropdown?.classList.add('open');
        this.ui.elements.profileBtn?.classList.add('open');
    }

    closeProfileDropdown() {
        this.ui.elements.profileDropdown?.classList.remove('open');
        this.ui.elements.profileBtn?.classList.remove('open');
    }

    // Connection (single device mode)
    toggleConnection() {
        if (!this.currentProfile) {
            alert('Please select a profile first');
            return;
        }

        const device = this.registry.getDevice(this.currentProfile.id);
        if (!device) return;

        if (device.state.isConnected) {
            device.disconnect();
        } else {
            device.connect();
        }
    }

    selectScene(sceneName) {
        this.ui.updateActiveScene(sceneName);
        this.sendToSelected('set_scene', { name: sceneName });
    }

    // Modal Management
    showModal() {
        this.ui.elements.modalOverlay?.classList.remove('hidden');
        this.ui.elements.newProfileName.value = '';
        this.ui.elements.newProfileUrl.value = '';
        this.ui.elements.newProfilePassword.value = '';
        this.ui.elements.newProfileName?.focus();
    }

    hideModal() {
        this.ui.elements.modalOverlay?.classList.add('hidden');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.moblinMultiRemote = new MoblinMultiRemote();

    // Initialize Match Setup Widget Controller
    setupMatchWidget();
});

// ============================================
// Match Setup Widget Controller (Dashboard)
// ============================================
function setupMatchWidget() {
    const el = {
        matchName: document.getElementById('dashMatchName'),
        matchDate: document.getElementById('dashMatchDate'),
        dvvLink: document.getElementById('dashDvvLink'),
        dvvImport: document.getElementById('dashDvvImport'),
        homeTeam: document.getElementById('dashHomeTeam'),
        awayTeam: document.getElementById('dashAwayTeam'),
        scoreHome: document.getElementById('dashScoreHome'),
        scoreAway: document.getElementById('dashScoreAway'),
        currentSet: document.getElementById('dashCurrentSet'),
        status: document.getElementById('dashMatchStatus')
    };

    // Exit if not on Dashboard page or elements don't exist
    if (!el.homeTeam || !window.matchState) {
        console.log('[MatchSetup] Widget not found or MatchState not available');
        return;
    }

    const state = window.matchState;

    /**
     * Render current state to UI
     * @param {Object} data - MatchState data
     */
    const render = (data) => {
        if (el.matchName) el.matchName.value = data.matchName || '';
        if (el.matchDate) el.matchDate.value = data.date || '';
        if (el.dvvLink) el.dvvLink.value = data.dvvLink || '';
        if (el.homeTeam) el.homeTeam.value = data.homeTeam || '';
        if (el.awayTeam) el.awayTeam.value = data.awayTeam || '';
        if (el.scoreHome) el.scoreHome.textContent = data.homePoints || 0;
        if (el.scoreAway) el.scoreAway.textContent = data.awayPoints || 0;
        if (el.currentSet) el.currentSet.textContent = `Satz ${data.currentSet || 1}`;
    };

    // Subscribe to state changes
    state.subscribe(render);

    // Input handlers with debounce
    let saveTimeout = null;
    const debouncedSave = (field, value) => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            state.update({ [field]: value });
        }, 300);
    };

    el.matchName?.addEventListener('input', (e) => {
        debouncedSave('matchName', e.target.value.trim());
    });

    el.matchDate?.addEventListener('change', (e) => {
        state.update({ date: e.target.value });
    });

    el.homeTeam?.addEventListener('input', (e) => {
        debouncedSave('homeTeam', e.target.value.trim() || 'Heim');
    });

    el.awayTeam?.addEventListener('input', (e) => {
        debouncedSave('awayTeam', e.target.value.trim() || 'Gast');
    });

    // DVV Import handler - Uses client-side SamsTickerService
    el.dvvImport?.addEventListener('click', async () => {
        const url = el.dvvLink?.value.trim();
        if (!url) {
            showStatus('Bitte Link eingeben', 'error');
            return;
        }

        // Extract match ID from DVV URL (format: .../stream/UUID or .../detail/UUID)
        const matchIdMatch = url.match(/(?:stream|detail)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (!matchIdMatch) {
            showStatus('Ungültiger DVV-Link', 'error');
            return;
        }

        const matchId = matchIdMatch[1];
        el.dvvImport.disabled = true;
        showStatus('Laden...', '');

        try {
            // Check if SamsTickerService is available
            if (typeof SamsTickerService === 'undefined') {
                throw new Error('SamsTickerService nicht geladen');
            }

            // Use client-side SamsTickerService to fetch match data
            const ticker = new SamsTickerService(matchId);
            const matches = await ticker.getAvailableMatches();
            const matchData = matches.find(m => m.id === matchId);

            if (!matchData) {
                throw new Error('Spiel nicht gefunden in SAMS');
            }

            // Update matchState with fetched data
            state.update({
                dvvLink: url,
                matchId: matchId,
                homeTeam: matchData.home || state.data.homeTeam,
                awayTeam: matchData.away || state.data.awayTeam,
                date: matchData.date || state.data.date
            });

            showStatus(`${matchData.home} vs ${matchData.away} ✓`, 'success');
            console.log('[MatchSetup] DVV Import successful:', matchData);

        } catch (e) {
            console.error('[MatchSetup] DVV Import error:', e);
            showStatus(e.message || 'Import fehlgeschlagen', 'error');
        } finally {
            el.dvvImport.disabled = false;
        }
    });

    /**
     * Show status message
     * @param {string} message
     * @param {'success' | 'error' | ''} type
     */
    function showStatus(message, type) {
        if (!el.status) return;
        el.status.textContent = message;
        el.status.className = 'match-setup-status';
        if (type) {
            el.status.classList.add(type);
        }

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                el.status.textContent = '';
                el.status.className = 'match-setup-status';
            }, 3000);
        }
    }

    console.log('[MatchSetup] Widget initialized');
}
