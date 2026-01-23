/**
 * Scoreboard Control Module
 * Manages live match score tracking for stream overlay integration
 */

class Scoreboard {
    constructor() {
        this.STORAGE_KEY = 'volleybratans_scoreboard';

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

        // State
        this.data = this.loadData();

        // API Base
        this.API_BASE = this.getApiBase();
        this.syncInterval = null;

        this.init();
    }

    getApiBase() {
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
            // If scout is available, update its scoreboard field
            if (window.scoutEngine) {
                window.scoutEngine.data.scoreboard = this.data;
                window.scoutEngine.saveData();
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

        // Set initial values
        this.el.homeTeam.value = this.data.homeTeam;
        this.el.awayTeam.value = this.data.awayTeam;
        this.render();

        // Event Listeners
        this.el.homeTeam.addEventListener('input', () => {
            this.data.homeTeam = this.el.homeTeam.value;
            this.saveData();
        });

        this.el.awayTeam.addEventListener('input', () => {
            this.data.awayTeam = this.el.awayTeam.value;
            this.saveData();
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

        console.log('[Scoreboard] Initialized');
    }

    addPoint(team) {
        if (team === 'home') {
            this.data.homePoints++;
        } else {
            this.data.awayPoints++;
        }
        this.saveData();
        this.render();
    }

    subPoint(team) {
        if (team === 'home' && this.data.homePoints > 0) {
            this.data.homePoints--;
        } else if (team === 'away' && this.data.awayPoints > 0) {
            this.data.awayPoints--;
        }
        this.saveData();
        this.render();
    }

    endSet() {
        // Add current set to history
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

        this.saveData();
        this.render();
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

    render() {
        if (!this.el.homePoints) return;

        this.el.homePoints.textContent = this.data.homePoints;
        this.el.awayPoints.textContent = this.data.awayPoints;
        this.el.homeSets.textContent = this.data.homeSets;
        this.el.awaySets.textContent = this.data.awaySets;
        this.el.currentSet.textContent = `Satz ${this.data.currentSet}`;

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
                home: this.data.homeTeam || 'Heim',
                away: this.data.awayTeam || 'Gast'
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
