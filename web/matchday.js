/**
 * Matchday Management Module
 * Centralizes configuration for teams, match ID, and date.
 */
class Matchday {
    constructor() {
        this.STORAGE_KEY = window.VB.STORAGE_KEYS.MATCHDAY;
        this.API_BASE = window.VB.getApiBase();

        this.data = this.loadData();

        this.init();
    }

    loadData() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : this.getDefaults();
        } catch (e) {
            console.warn('[Matchday] Load error', e);
            return this.getDefaults();
        }
    }

    getDefaults() {
        return {
            homeTeam: 'Heim',
            awayTeam: 'Gast',
            date: new Date().toISOString().split('T')[0],
            dvvLink: '',
            matchId: '',
            version: 0
        };
    }

    saveData() {
        try {
            this.data.version = Date.now();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
            this.syncToServer();
        } catch (e) {
            console.error('[Matchday] Save error', e);
        }
    }

    async syncToServer() {
        if (!this.API_BASE) return; // No server to sync to

        try {
            await fetch(`${this.API_BASE}${window.VB.API.MATCHDAY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.data)
            });
            console.log('[Matchday] Synced to server');
        } catch (e) {
            console.warn('[Matchday] Server sync failed', e);
        }
    }

    init() {
        // Elements
        this.el = {
            dvvLink: document.getElementById('dvvLinkInput'),
            importBtn: document.getElementById('importDvvBtn'),
            dvvStatus: document.getElementById('dvvStatus'),
            homeTeam: document.getElementById('globalHomeTeam'),
            awayTeam: document.getElementById('globalAwayTeam'),
            previewHome: document.getElementById('previewHome'),
            previewAway: document.getElementById('previewAway'),
            date: document.getElementById('matchDate'),
            matchId: document.getElementById('matchId'),
            saveBtn: document.getElementById('saveMatchdayBtn'),
            resetBtn: document.getElementById('resetMatchdayBtn')
        };

        // Bind Data
        this.render();

        // Listeners
        this.el.saveBtn.addEventListener('click', () => {
            this.updateDataFromUI();
            this.saveData();
            this.showStatus('Gespeichert ✓', 'success');
        });

        this.el.resetBtn.addEventListener('click', () => {
            if (confirm('Wirklich zurücksetzen?')) {
                this.data = this.getDefaults();
                this.render();
                this.saveData();
            }
        });

        // Live Preview
        ['homeTeam', 'awayTeam'].forEach(key => {
            this.el[key].addEventListener('input', () => this.updatePreview());
        });

        // DVV Import
        this.el.importBtn.addEventListener('click', () => this.importFromDvv());
    }

    render() {
        this.el.dvvLink.value = this.data.dvvLink || '';
        this.el.homeTeam.value = this.data.homeTeam || '';
        this.el.awayTeam.value = this.data.awayTeam || '';
        this.el.date.value = this.data.date;
        this.el.matchId.value = this.data.matchId || '';

        this.updatePreview();
    }

    updateDataFromUI() {
        this.data.dvvLink = this.el.dvvLink.value.trim();
        this.data.homeTeam = this.el.homeTeam.value.trim() || 'Heim';
        this.data.awayTeam = this.el.awayTeam.value.trim() || 'Gast';
        this.data.date = this.el.date.value;
        this.data.matchId = this.el.matchId.value;
    }

    updatePreview() {
        const home = this.el.homeTeam.value.trim() || 'Heim';
        const away = this.el.awayTeam.value.trim() || 'Gast';

        this.el.previewHome.textContent = home;
        this.el.previewAway.textContent = away;
    }

    async importFromDvv() {
        const url = this.el.dvvLink.value.trim();
        if (!url) {
            this.showStatus('Bitte Link eingeben', 'error');
            return;
        }

        this.el.importBtn.disabled = true;
        this.el.importBtn.innerHTML = '<span class="animate-spin">↻</span> Laden...';

        try {
            // Option 1: Try Server-Side Parse if available
            if (this.API_BASE) {
                const res = await fetch(`${this.API_BASE}${window.VB.API.MATCHDAY_PARSE}?url=${encodeURIComponent(url)}`);
                if (!res.ok) throw new Error('Server Parse fehlgeschlagen');
                const result = await res.json();
                this.applyImport(result);
            } else {
                // Option 2: Client-Side Fallback (might fail due to CORS)
                // Use a CORS proxy if available or try direct fetch
                // For MVP, we simulate or assume local proxy overrides
                console.warn('[Matchday] No API Base, simulating fetch or CORS error');
                // TODO: Implement client-side scraping fallback via proxy
                throw new Error('Server erforderlich für DVV Import');
            }
            this.showStatus('Daten importiert', 'success');
        } catch (e) {
            console.error(e);
            this.showStatus('Import fehlgeschlagen: ' + e.message, 'error');
        } finally {
            this.el.importBtn.disabled = false;
            this.el.importBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:1em;height:1em;display:inline-block;vertical-align:middle;margin-right:0.5em">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Laden
            `;
        }
    }

    applyImport(result) {
        if (result.homeTeam) this.data.homeTeam = result.homeTeam;
        if (result.awayTeam) this.data.awayTeam = result.awayTeam;
        if (result.date) this.data.date = result.date;
        if (result.matchId) this.data.matchId = result.matchId;

        this.render();
        this.saveData(); // Auto-save on import
    }

    showStatus(msg, type) {
        const badge = this.el.dvvStatus;
        badge.textContent = msg;
        badge.className = `matchday-status-badge ${type === 'success' ? 'active' : ''}`;
        badge.classList.remove('hidden');

        if (type === 'success') {
            setTimeout(() => badge.classList.add('hidden'), 3000);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.matchdayManager = new Matchday();
});
