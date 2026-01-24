/**
 * MatchState Service
 * Central source of truth for match configuration, synced across all modules.
 * 
 * @module match-state
 * @version 1.0.0
 * 
 * @fires matchstate:updated - When any match data changes
 * @fires matchstate:score - When score specifically changes
 */
class MatchState {
    constructor() {
        /** @type {string} */
        this.STORAGE_KEY = window.VB?.STORAGE_KEYS?.MATCHDAY || 'volleybratans_matchday';

        /** @type {Set<Function>} */
        this.listeners = new Set();

        /** @type {MatchStateData} */
        this.data = this.load();

        // Listen for storage events from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === this.STORAGE_KEY) {
                this.data = this.load();
                this.notify();
            }
        });

        console.log('[MatchState] Initialized with data:', this.data);
    }

    /**
     * Get default match state values
     * @returns {MatchStateData}
     */
    getDefaults() {
        return {
            matchName: '',
            homeTeam: 'Heim',
            awayTeam: 'Gast',
            date: new Date().toISOString().split('T')[0],
            dvvLink: '',
            matchId: '',
            homePoints: 0,
            awayPoints: 0,
            homeSets: 0,
            awaySets: 0,
            currentSet: 1,
            setHistory: [],
            version: 0
        };
    }

    /**
     * Load state from localStorage
     * @returns {MatchStateData}
     */
    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure all fields exist
                return { ...this.getDefaults(), ...parsed };
            }
            return this.getDefaults();
        } catch (e) {
            console.warn('[MatchState] Load error', e);
            return this.getDefaults();
        }
    }

    /**
     * Save current state to localStorage
     */
    save() {
        try {
            this.data.version = Date.now();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
            this.notify();
        } catch (e) {
            console.error('[MatchState] Save error', e);
        }
    }

    /**
     * Update state with partial data
     * @param {Partial<MatchStateData>} updates
     */
    update(updates) {
        Object.assign(this.data, updates);
        this.save();
    }

    /**
     * Subscribe to state changes
     * @param {(data: MatchStateData) => void} callback
     * @returns {() => void} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        // Immediate call with current state
        callback(this.data);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of state change
     */
    notify() {
        this.listeners.forEach(cb => {
            try {
                cb(this.data);
            } catch (e) {
                console.error('[MatchState] Listener error', e);
            }
        });

        // Dispatch DOM event for non-subscribed consumers
        document.dispatchEvent(new CustomEvent('matchstate:updated', {
            detail: this.data
        }));
    }

    // ========================================
    // Score Management Helpers
    // ========================================

    /**
     * Add a point to a team
     * @param {'home' | 'away'} team
     */
    addPoint(team) {
        if (team === 'home') {
            this.data.homePoints++;
        } else {
            this.data.awayPoints++;
        }
        this.save();

        // Emit specific score event
        document.dispatchEvent(new CustomEvent('matchstate:score', {
            detail: {
                homePoints: this.data.homePoints,
                awayPoints: this.data.awayPoints
            }
        }));
    }

    /**
     * Subtract a point from a team (min 0)
     * @param {'home' | 'away'} team
     */
    subPoint(team) {
        if (team === 'home' && this.data.homePoints > 0) {
            this.data.homePoints--;
        } else if (team === 'away' && this.data.awayPoints > 0) {
            this.data.awayPoints--;
        }
        this.save();

        document.dispatchEvent(new CustomEvent('matchstate:score', {
            detail: {
                homePoints: this.data.homePoints,
                awayPoints: this.data.awayPoints
            }
        }));
    }

    /**
     * End the current set and determine winner
     */
    endSet() {
        // Record set result
        this.data.setHistory.push({
            home: this.data.homePoints,
            away: this.data.awayPoints
        });

        // Update set scores
        if (this.data.homePoints > this.data.awayPoints) {
            this.data.homeSets++;
        } else {
            this.data.awaySets++;
        }

        // Reset points for new set
        this.data.homePoints = 0;
        this.data.awayPoints = 0;
        this.data.currentSet++;

        this.save();
    }

    /**
     * Reset match (keeps team names)
     */
    reset() {
        const teams = {
            homeTeam: this.data.homeTeam,
            awayTeam: this.data.awayTeam,
            date: this.data.date,
            dvvLink: this.data.dvvLink,
            matchId: this.data.matchId
        };
        this.data = { ...this.getDefaults(), ...teams };
        this.save();
    }

    /**
     * Full reset including team names
     */
    fullReset() {
        this.data = this.getDefaults();
        this.save();
    }

    // ========================================
    // Getters for convenience
    // ========================================

    /** @returns {string} */
    get matchName() { return this.data.matchName || ''; }

    /** @returns {string} */
    get date() { return this.data.date || new Date().toISOString().split('T')[0]; }

    /** @returns {string} */
    get homeTeam() { return this.data.homeTeam || 'Heim'; }

    /** @returns {string} */
    get awayTeam() { return this.data.awayTeam || 'Gast'; }

    /** @returns {number} */
    get homePoints() { return this.data.homePoints || 0; }

    /** @returns {number} */
    get awayPoints() { return this.data.awayPoints || 0; }

    /** @returns {number} */
    get homeSets() { return this.data.homeSets || 0; }

    /** @returns {number} */
    get awaySets() { return this.data.awaySets || 0; }

    /** @returns {number} */
    get currentSet() { return this.data.currentSet || 1; }

    /**
     * Get formatted score string
     * @returns {string}
     */
    getScoreString() {
        return `${this.data.homePoints}:${this.data.awayPoints}`;
    }

    /**
     * Get formatted sets string
     * @returns {string}
     */
    getSetsString() {
        return `${this.data.homeSets}:${this.data.awaySets}`;
    }
}

/**
 * @typedef {Object} MatchStateData
 * @property {string} homeTeam
 * @property {string} awayTeam
 * @property {string} date - ISO date string (YYYY-MM-DD)
 * @property {string} dvvLink - DVV ticker URL
 * @property {string} matchId
 * @property {number} homePoints
 * @property {number} awayPoints
 * @property {number} homeSets
 * @property {number} awaySets
 * @property {number} currentSet
 * @property {Array<{home: number, away: number}>} setHistory
 * @property {number} version - Timestamp for sync
 */

// Create and export singleton instance
window.matchState = new MatchState();
