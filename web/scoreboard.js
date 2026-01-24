/**
 * Scoreboard Control Module
 * Manages live match score tracking for stream overlay integration
 * 
 * v2: Now integrated with central MatchState service for cross-module sync
 */

class Scoreboard {
    constructor() {
        // Use MatchState as the source of truth if available
        this.useMatchState = !!window.matchState;

        // Fallback storage key for legacy mode
        this.STORAGE_KEY = window.VB?.STORAGE_KEYS?.SCOREBOARD || 'volleybratans_scoreboard';

        // DOM Elements
        this.el = {
            panel: document.getElementById('scoreboardPanel'),
            homeTeam: document.getElementById('sbHomeTeam'),
            awayTeam: document.getElementById('sbAwayTeam'),
            homePoints: document.getElementById('sbHomePoints'),
            awayPoints: document.getElementById('sbAwayPoints'),
            homeSets: document.getElementById('sbHomeSets'),
            awaySets: document.getElementById('sbAwaySets'),
            currentSet: document.getElementById('sbCurrentSet'),
            setHistory: document.getElementById('sbSetHistory'),
            endSetBtn: document.getElementById('sbEndSet')
        };

        // State - use MatchState if available
        if (this.useMatchState) {
            this.data = window.matchState.data;
        } else {
            this.data = this.loadData();
        }

        // API Base - use shared getApiBase if available
        this.API_BASE = window.VB?.getApiBase ? window.VB.getApiBase() : this._getApiBaseFallback();
        this.syncInterval = null;

        this.init();
    }

    /**
     * Fallback API base URL determination (used if config.js not loaded)
     * @private
     */
    _getApiBaseFallback() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:8080';
        }
        if (window.location.port === '5000') {
            return `${window.location.protocol}//${window.location.hostname}:8080`;
        }
        return '';
    }

    loadData() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[Scoreboard] Could not load data', e);
        }

        return {
            homeTeam: '',
            awayTeam: '',
            homeSets: 0,
            awaySets: 0,
            homePoints: 0,
            awayPoints: 0,
            currentSet: 1,
            setHistory: []
        };
    }

    saveData() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('[Scoreboard] Could not save', e);
        }

        // Sync to server
        this.syncToServer();
    }

    async syncToServer() {
        try {
            // If scout is available, update its scoreboard reference (for unified API sync)
            // NOTE: We do NOT call scoutEngine.saveData() here to avoid duplicate saves.
            // The scoreboard has its own localStorage key, and ScoutEngine will include
            // scoreboard data in its next sync cycle automatically.
            if (window.scoutEngine) {
                window.scoutEngine.data.scoreboard = this.data;
            }
        } catch (e) {
            console.warn('[Scoreboard] Sync error', e);
        }
    }

    init() {
        if (!this.el.panel) {
            console.log('[Scoreboard] Panel not found');
            return;
        }

        // Subscribe to MatchState changes if available
        if (this.useMatchState) {
            window.matchState.subscribe((data) => {
                this.data = data;
                this.render();
            });
        }

        // Set initial values
        if (this.el.homeTeam) this.el.homeTeam.value = this.data.homeTeam || '';
        if (this.el.awayTeam) this.el.awayTeam.value = this.data.awayTeam || '';
        this.render();

        // Event Listeners for team name inputs
        this.el.homeTeam?.addEventListener('input', () => {
            const value = this.el.homeTeam.value;
            if (this.useMatchState) {
                window.matchState.update({ homeTeam: value });
            } else {
                this.data.homeTeam = value;
                this.saveData();
            }
        });

        this.el.awayTeam?.addEventListener('input', () => {
            const value = this.el.awayTeam.value;
            if (this.useMatchState) {
                window.matchState.update({ awayTeam: value });
            } else {
                this.data.awayTeam = value;
                this.saveData();
            }
        });

        // Point buttons
        this.el.panel.addEventListener('click', (e) => {
            const btn = e.target.closest('.sb-btn');
            if (!btn) return;

            const team = btn.dataset.team;
            const action = btn.dataset.action;

            if (action === 'add') {
                this.addPoint(team);
            } else if (action === 'sub') {
                this.subPoint(team);
            }
        });

        // End set button
        this.el.endSetBtn?.addEventListener('click', () => this.endSet());

        console.log('[Scoreboard] Initialized' + (this.useMatchState ? ' (MatchState mode)' : ' (Legacy mode)'));
    }

    addPoint(team) {
        if (this.useMatchState) {
            window.matchState.addPoint(team);
            // Render is handled by subscription
        } else {
            if (team === 'home') {
                this.data.homePoints++;
            } else {
                this.data.awayPoints++;
            }
            this.saveData();
            this.render();
        }
    }

    subPoint(team) {
        if (this.useMatchState) {
            window.matchState.subPoint(team);
            // Render is handled by subscription
        } else {
            if (team === 'home' && this.data.homePoints > 0) {
                this.data.homePoints--;
            } else if (team === 'away' && this.data.awayPoints > 0) {
                this.data.awayPoints--;
            }
            this.saveData();
            this.render();
        }
    }

    endSet() {
        if (this.useMatchState) {
            window.matchState.endSet();
            // Render is handled by subscription
        } else {
            // Legacy mode: manage locally
            this.data.setHistory.push({
                home: this.data.homePoints,
                away: this.data.awayPoints
            });

            if (this.data.homePoints > this.data.awayPoints) {
                this.data.homeSets++;
            } else {
                this.data.awaySets++;
            }

            this.data.homePoints = 0;
            this.data.awayPoints = 0;
            this.data.currentSet++;

            this.saveData();
            this.render();
        }
    }

    reset() {
        this.data = {
            homeTeam: this.data.homeTeam,
            awayTeam: this.data.awayTeam,
            homeSets: 0,
            awaySets: 0,
            homePoints: 0,
            awayPoints: 0,
            currentSet: 1,
            setHistory: []
        };
        this.saveData();
        this.render();
    }

    // Get Matchday Config
    getMatchdayData() {
        try {
            const json = localStorage.getItem(window.VB?.STORAGE_KEYS?.MATCHDAY);
            return json ? JSON.parse(json) : null;
        } catch (e) { return null; }
    }

    getHomeTeam() {
        if (this.data.homeTeam) return this.data.homeTeam;
        const md = this.getMatchdayData();
        return md ? md.homeTeam : '';
    }

    getAwayTeam() {
        if (this.data.awayTeam) return this.data.awayTeam;
        const md = this.getMatchdayData();
        return md ? md.awayTeam : '';
    }

    render() {
        if (!this.el.homePoints) return;

        this.el.homePoints.textContent = this.data.homePoints;
        this.el.awayPoints.textContent = this.data.awayPoints;
        this.el.homeSets.textContent = this.data.homeSets;
        this.el.awaySets.textContent = this.data.awaySets;
        this.el.currentSet.textContent = `Satz ${this.data.currentSet}`;

        // Update placeholders with global teams
        const md = this.getMatchdayData();
        if (md && this.el.homeTeam && this.el.awayTeam) {
            this.el.homeTeam.placeholder = md.homeTeam || 'Heim';
            this.el.awayTeam.placeholder = md.awayTeam || 'Gast';
        }

        // Render set history
        if (this.el.setHistory) {
            this.el.setHistory.innerHTML = this.data.setHistory.map((set, i) =>
                `<span class="sb-set-result">${set.home}:${set.away}</span>`
            ).join('');
        }
    }

    // Get data for overlay
    getData() {
        return {
            ...this.data,
            teams: {
                home: this.getHomeTeam() || 'Heim',
                away: this.getAwayTeam() || 'Gast'
            },
            sets: {
                home: this.data.homeSets,
                away: this.data.awaySets
            },
            currentPoints: {
                home: this.data.homePoints,
                away: this.data.awayPoints
            }
        };
    }
}

// Initialize when DOM is ready
let scoreboard;
document.addEventListener('DOMContentLoaded', () => {
    scoreboard = new Scoreboard();
    window.scoreboard = scoreboard;
});
