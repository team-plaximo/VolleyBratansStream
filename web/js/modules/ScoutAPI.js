/**
 * Scout API Module - Server Communication
 * Handles syncing state with the backend server
 * 
 * @module ScoutAPI
 */

export class ScoutAPI {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || '';
        this.syncInterval = null;
        this.checkInterval = null;
        this.onUpdate = options.onUpdate || null;
        this.onVersionMismatch = options.onVersionMismatch || null;
    }

    /**
     * Determine API base URL based on environment
     */
    static getApiBase() {
        // Use shared config if available
        if (window.VB?.getApiBase) {
            return window.VB.getApiBase();
        }

        // Fallback logic
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${hostname}:8080`;
        }
        return '';
    }

    /**
     * Fetch current state from server
     */
    async fetchState() {
        try {
            const response = await fetch(`${this.baseUrl}/api/scout`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('[ScoutAPI] Fetch failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Push state to server
     */
    async pushState(state) {
        try {
            const response = await fetch(`${this.baseUrl}/api/scout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify(state)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('[ScoutAPI] Push failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Check current version on server (lightweight poll)
     */
    async checkVersion() {
        try {
            const response = await fetch(`${this.baseUrl}/api/scout/version`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return { success: true, version: data.version };
        } catch (error) {
            return { success: false, error };
        }
    }

    /**
     * Archive current match and reset
     */
    async archiveMatch() {
        try {
            const response = await fetch(`${this.baseUrl}/api/scout/archive`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('[ScoutAPI] Archive failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Start periodic sync with server
     */
    startSync(intervalMs = 5000) {
        this.stopSync();

        this.syncInterval = setInterval(() => {
            if (this.onUpdate) {
                this.onUpdate();
            }
        }, intervalMs);

        console.log(`[ScoutAPI] Sync started (${intervalMs}ms interval)`);
    }

    /**
     * Start periodic version checking
     */
    startVersionCheck(intervalMs = 3000, currentVersionGetter, onMismatch) {
        this.stopVersionCheck();

        this.checkInterval = setInterval(async () => {
            const result = await this.checkVersion();
            if (result.success && currentVersionGetter) {
                const localVersion = currentVersionGetter();
                if (result.version > localVersion) {
                    console.log(`[ScoutAPI] Version mismatch: server=${result.version}, local=${localVersion}`);
                    if (onMismatch) {
                        onMismatch(result.version);
                    }
                }
            }
        }, intervalMs);

        console.log(`[ScoutAPI] Version check started (${intervalMs}ms interval)`);
    }

    /**
     * Stop periodic sync
     */
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Stop version checking
     */
    stopVersionCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Stop all intervals
     */
    destroy() {
        this.stopSync();
        this.stopVersionCheck();
    }
}

export default ScoutAPI;
