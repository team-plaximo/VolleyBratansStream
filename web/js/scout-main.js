/**
 * Scout Main Entry Point
 * Orchestrates all Scout modules into a unified engine
 * 
 * This is the ES6 module entry point for the Scout system.
 * It imports and coordinates all sub-modules.
 * 
 * @module scout-main
 */

import { ScoutState } from './modules/ScoutState.js';
import { ScoutAPI } from './modules/ScoutAPI.js';
import { ScoutKeyboard } from './modules/ScoutKeyboard.js';
import { ScoutStats } from './modules/ScoutStats.js';

/**
 * Scout Engine - Main Application Class
 * Coordinates state, API, keyboard, and rendering
 */
class ScoutEngineModular {
    constructor() {
        // Use shared config if available
        const storageKey = window.VB?.STORAGE_KEYS?.SCOUT || 'volleybratans_scout';

        // Initialize modules
        this.state = new ScoutState(storageKey);
        this.api = new ScoutAPI({
            baseUrl: ScoutAPI.getApiBase(),
            onUpdate: () => this.syncToServer()
        });
        this.keyboard = new ScoutKeyboard({
            state: this.state,
            onScoreAdded: () => this.onScoreAdded(),
            onUndo: () => this.undoLastAction(),
            onRender: () => this.render()
        });

        // UI state
        this.elements = {
            tableBody: null,
            tableFoot: null,
            emptyState: null,
            matchName: null,
            matchDate: null,
            summaryGrid: null
        };

        this.initialized = false;
        this.tableListenersInitialized = false; // Guard for event delegation
    }

    /**
     * Initialize the Scout Engine
     */
    async init() {
        console.log('[ScoutEngine] Initializing modular engine...');

        // Cache DOM elements
        this.cacheElements();

        // Initialize keyboard shortcuts
        this.keyboard.init();

        // Bind header action buttons
        this.bindHeaderButtons();

        // Try to load from server first, fallback to local
        const loaded = await this.loadFromServer();
        if (!loaded) {
            this.state.loadLocal();
        }

        // Apply matchday config if available
        await this.applyMatchdayConfig();

        // Initial render
        this.render();

        // Start sync interval
        this.api.startSync(5000);

        // Start version checking
        this.api.startVersionCheck(3000,
            () => this.state.lastServerVersion,
            (serverVersion) => this.handleVersionMismatch(serverVersion)
        );

        this.initialized = true;
        console.log('[ScoutEngine] Modular engine initialized');
    }

    /**
     * Cache frequently accessed DOM elements
     */
    cacheElements() {
        this.elements = {
            tableBody: document.getElementById('scoutTableBody'),
            tableFoot: document.getElementById('scoutTableFoot'),
            emptyState: document.getElementById('scoutEmptyState'),
            matchName: document.getElementById('scoutMatchName'),
            matchDate: document.getElementById('scoutMatchDate'),
            summaryGrid: document.getElementById('scoutSummaryGrid'),
            killRatio: document.getElementById('scoutKillRatio'),
            receptionPct: document.getElementById('scoutReceptionPct'),
            aces: document.getElementById('scoutAces'),
            ue: document.getElementById('scoutUE')
        };
    }

    /**
     * Load state from server
     */
    async loadFromServer() {
        const result = await this.api.fetchState();
        if (result.success && result.data) {
            this.state.fromJSON(result.data);
            this.state.lastServerVersion = result.data.version || 0;
            console.log('[ScoutEngine] Loaded from server (v' + this.state.lastServerVersion + ')');
            return true;
        }
        return false;
    }

    /**
     * Sync state to server
     */
    async syncToServer() {
        if (!this.state.isDirty) return;

        const result = await this.api.pushState(this.state.toJSON());
        if (result.success) {
            this.state.markClean();
            if (result.data?.version) {
                this.state.lastServerVersion = result.data.version;
            }
            console.log('[ScoutEngine] Synced to server');
        }
    }

    /**
     * Handle version mismatch (someone else updated)
     */
    async handleVersionMismatch(serverVersion) {
        console.log('[ScoutEngine] Server has newer version, fetching...');
        await this.loadFromServer();
        this.render();
    }

    /**
     * Apply matchday configuration if available
     */
    async applyMatchdayConfig() {
        try {
            const response = await fetch(`${this.api.baseUrl}/api/matchday`, {
                credentials: 'same-origin'
            });
            if (response.ok) {
                const config = await response.json();
                if (config.homeTeam && config.awayTeam) {
                    const defaultName = `${config.homeTeam} vs ${config.awayTeam}`;
                    if (!this.state.matchName) {
                        this.state.matchName = defaultName;
                    }
                }
                if (config.date && !this.state.matchDate) {
                    this.state.matchDate = config.date;
                }
            }
        } catch (e) {
            console.log('[ScoutEngine] Matchday config not available');
        }
    }

    /**
     * Called when a score is added
     */
    onScoreAdded() {
        this.state.saveLocal();
        this.syncToServer();
    }

    /**
     * Undo last action
     */
    undoLastAction() {
        const action = this.state.popUndoStack();
        if (!action) {
            this.keyboard.showFeedback('Nichts zum Rückgängig machen');
            return;
        }

        if (action.type === 'score') {
            this.state.undoLastScore(action.playerId, action.element);
            this.keyboard.showFeedback(`Rückgängig: ${action.element}`);
            this.render();
            this.state.saveLocal();
            this.syncToServer();
        }
    }

    /**
     * Main render function
     */
    render() {
        if (!this.elements.tableBody) {
            this.cacheElements();
        }

        // Update match info
        if (this.elements.matchName) {
            this.elements.matchName.value = this.state.matchName;
        }
        if (this.elements.matchDate) {
            this.elements.matchDate.textContent = this.formatDate(this.state.matchDate);
        }

        // Render players
        this.renderPlayers();

        // Update summary
        this.updateSummary();

        // Update keyboard indicator
        this.keyboard.updateIndicator();
    }

    /**
     * Render player rows
     */
    renderPlayers() {
        if (!this.elements.tableBody) return;

        if (this.state.players.length === 0) {
            if (this.elements.emptyState) {
                this.elements.emptyState.classList.remove('hidden');
            }
            this.elements.tableBody.innerHTML = '';
            if (this.elements.tableFoot) {
                this.elements.tableFoot.innerHTML = '';
            }
            return;
        }

        if (this.elements.emptyState) {
            this.elements.emptyState.classList.add('hidden');
        }

        // Build player rows with starting lineup separator
        const STARTING_LINEUP_SIZE = 7; // 6 players + 1 libero
        let html = '';

        this.state.players.forEach((player, index) => {
            // Add separator row after starting lineup
            if (index === STARTING_LINEUP_SIZE) {
                html += this.renderSeparatorRow();
            }
            html += this.renderPlayerRow(player, index, index < STARTING_LINEUP_SIZE);
        });

        this.elements.tableBody.innerHTML = html;

        // Render team totals
        if (this.elements.tableFoot) {
            this.elements.tableFoot.innerHTML = this.renderTeamRow();
        }

        // Initialize event listeners ONCE using event delegation
        // This should NOT be called on every render!
        if (!this.tableListenersInitialized) {
            this.attachRowListeners();
            this.tableListenersInitialized = true;
        }
    }

    /**
     * Render separator row between starting lineup and bench
     */
    renderSeparatorRow() {
        const colSpan = ScoutState.ELEMENTS.length + 2; // player + elements + actions
        return `
            <tr class="scout-separator-row">
                <td colspan="${colSpan}">
                    <div class="scout-separator">
                        <span class="scout-separator-line"></span>
                        <span class="scout-separator-label">Bank</span>
                        <span class="scout-separator-line"></span>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Render a single player row
     * @param {Object} player - Player object
     * @param {number} index - Player index in list
     * @param {boolean} isOnCourt - Whether player is in starting lineup (position <= 7)
     */
    renderPlayerRow(player, index, isOnCourt = false) {
        const elements = ScoutState.ELEMENTS;
        const posClass = player.position ? `pos-${player.position}` : '';

        let cellsHtml = '';
        elements.forEach(el => {
            const scores = player.scores[el] || [];
            const avg = ScoutStats.calculateAverage(scores);
            const avgClass = ScoutStats.getAverageClass(avg);

            // Binary elements (Block, Feldabwehr, Freeball) get only 2 buttons (3, 0)
            const isBinary = ScoutState.BINARY_ELEMENTS.includes(el);
            const scoreButtons = isBinary
                ? `<button class="scout-score-btn scout-score-3" data-score="3">3</button>
                   <button class="scout-score-btn scout-score-0" data-score="0">0</button>`
                : `<button class="scout-score-btn scout-score-0" data-score="0">0</button>
                   <button class="scout-score-btn scout-score-1" data-score="1">1</button>
                   <button class="scout-score-btn scout-score-2" data-score="2">2</button>
                   <button class="scout-score-btn scout-score-3" data-score="3">3</button>`;

            cellsHtml += `
                <td data-element="${el}" data-player="${player.id}">
                    <div class="scout-cell">
                        <div class="scout-cell-stats-inline" data-action="history">
                            <span class="scout-avg ${avgClass}">${avg}</span>
                            <span class="scout-count">${scores.length}</span>
                        </div>
                        <div class="scout-score-btns${isBinary ? ' scout-binary' : ''}">
                            ${scoreButtons}
                        </div>
                    </div>
                </td>
            `;
        });

        // Keyboard shortcut badge (for first 9 players)
        const keyboardKey = index < 9 ? index + 1 : null;
        const keyBadge = keyboardKey ? `<span class="scout-key-badge" title="Taste ${keyboardKey}">${keyboardKey}</span>` : '';

        // On-court styling based on position in list (not toggle)
        const onCourtClass = isOnCourt ? 'scout-on-court' : 'scout-on-bench';
        const liberoClass = player.position === 'L' ? 'scout-libero' : '';

        return `
            <tr class="scout-row ${onCourtClass} ${liberoClass}" data-player-id="${player.id}" data-index="${index}" draggable="true">
                <td class="scout-td-player">
                    <div class="scout-player-row-content">
                        <div class="scout-player-info">
                            <span class="scout-drag-handle" title="Ziehen zum Verschieben">⋮⋮</span>
                            ${keyBadge}
                            <span class="scout-player-number" data-action="edit-number">
                                ${player.number ? '#' + player.number : '#'}
                            </span>
                            <span class="scout-player-name">${this.escapeHtml(player.name)}</span>
                            <span class="scout-position-badge ${posClass}" data-action="cycle-position">
                                ${player.position || '?'}
                            </span>
                        </div>
                    </div>
                </td>
                ${cellsHtml}
                <td class="scout-actions-cell">
                    <div class="scout-player-actions">
                        <button class="scout-player-delete" data-action="delete" title="Spieler entfernen">
                            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Render team totals row
     */
    renderTeamRow() {
        const elements = ScoutState.ELEMENTS;

        let cellsHtml = '';
        elements.forEach(el => {
            const result = ScoutStats.calcTeamAvg(this.state.players, el);
            const avgClass = ScoutStats.getAverageClass(result.avg);
            cellsHtml += `
                <td>
                    <div class="scout-cell scout-team-cell">
                        <span class="scout-cell-avg ${avgClass}">${result.avg}</span>
                        <span class="scout-cell-count">${result.count}</span>
                    </div>
                </td>
            `;
        });

        return `
            <tr class="scout-team-row">
                <td class="scout-td-player"><strong>TEAM</strong></td>
                ${cellsHtml}
                <td></td>
            </tr>
        `;
    }

    /**
     * Attach event listeners to player rows
     */
    attachRowListeners() {
        if (!this.elements.tableBody) return;

        this.elements.tableBody.addEventListener('click', (e) => {
            const target = e.target;
            const row = target.closest('.scout-row');
            const playerId = row?.dataset.playerId;

            // 1. FIRST: Check for Score Button clicks (highest priority)
            const scoreBtn = target.closest('.scout-score-btn');
            if (scoreBtn && playerId) {
                const score = parseInt(scoreBtn.dataset.score);
                const cellTd = scoreBtn.closest('td[data-element]');
                const element = cellTd?.dataset.element;

                if (element !== undefined) {
                    this.state.addScore(playerId, element, score);
                    this.render();
                    this.state.saveLocal();
                    this.syncToServer();
                }
                return; // Early return after handling score button
            }

            // 2. THEN: Handle action-based events
            const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;

            if (!playerId && !action) return;

            switch (action) {
                case 'toggle-active':
                    this.state.toggleActive(playerId);
                    this.render();
                    this.state.saveLocal();
                    this.syncToServer();
                    break;

                case 'cycle-position':
                    this.state.cyclePosition(playerId);
                    this.render();
                    this.state.saveLocal();
                    this.syncToServer();
                    break;

                case 'edit-number':
                    this.showNumberEditModal(playerId);
                    break;

                case 'delete':
                    if (confirm('Spieler wirklich entfernen?')) {
                        this.state.removePlayer(playerId);
                        this.render();
                        this.state.saveLocal();
                        this.syncToServer();
                    }
                    break;

                case 'history':
                    const historyTd = target.closest('td[data-element]');
                    if (historyTd) {
                        const element = historyTd.dataset.element;
                        this.showScoreHistoryModal(playerId, element);
                    }
                    break;
            }
        });
    }

    /**
     * Update summary statistics
     */
    updateSummary() {
        const summary = ScoutStats.getSummary(this.state.players);

        if (this.elements.killRatio) {
            this.elements.killRatio.textContent = summary.killRatio;
        }
        if (this.elements.receptionPct) {
            this.elements.receptionPct.textContent = summary.receptionPct;
        }
        if (this.elements.aces) {
            this.elements.aces.textContent = summary.aces;
        }
        if (this.elements.ue) {
            this.elements.ue.textContent = summary.errors;
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('de-DE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show number edit modal (placeholder - uses legacy method if available)
     */
    showNumberEditModal(playerId) {
        // Fallback to legacy if available
        if (window.scoutEngine?.showNumberEditModal) {
            window.scoutEngine.showNumberEditModal(playerId);
        } else {
            const player = this.state.getPlayer(playerId);
            if (!player) return;

            const newNumber = prompt('Trikotnummer:', player.number || '');
            if (newNumber !== null) {
                this.state.setNumber(playerId, newNumber || null);
                this.render();
                this.state.saveLocal();
                this.syncToServer();
            }
        }
    }

    /**
     * Show score history modal (placeholder - uses legacy method if available)
     */
    showScoreHistoryModal(playerId, element) {
        // Fallback to legacy if available
        if (window.scoutEngine?.showScoreHistoryModal) {
            window.scoutEngine.showScoreHistoryModal(playerId, element);
        } else {
            console.log('[ScoutEngine] Score history modal not implemented in modular version yet');
        }
    }

    /**
     * Add a player
     */
    addPlayer(name, number = null) {
        const player = this.state.addPlayer(name, number);
        if (player) {
            this.render();
            this.state.saveLocal();
            this.syncToServer();
        }
        return player;
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.api.destroy();
        this.keyboard.destroy();
    }

    /**
     * Bind header action buttons (Spieler, Neues Spiel, Hilfe, Export)
     */
    bindHeaderButtons() {
        document.getElementById('scoutAddPlayer')?.addEventListener('click', () => this.showImportModal());
        document.getElementById('scoutAddPlayerEmpty')?.addEventListener('click', () => this.showImportModal());
        document.getElementById('scoutNewMatch')?.addEventListener('click', () => this.newMatch());
        document.getElementById('scoutHelp')?.addEventListener('click', () => this.showHelpModal());
        document.getElementById('scoutExport')?.addEventListener('click', () => this.exportData());
    }

    /**
     * Show player import modal
     */
    showImportModal() {
        // Check if legacy modal implementation exists
        if (window.scoutEngine?.showImportModal) {
            window.scoutEngine.showImportModal();
            return;
        }

        // Simple fallback: prompt for player name
        const name = prompt('Spielername:');
        if (name && name.trim()) {
            const number = prompt('Trikotnummer (optional):');
            this.addPlayer(name, number ? parseInt(number) : null);
        }
    }

    /**
     * Start new match (reset all data)
     */
    newMatch() {
        if (confirm('Neues Spiel starten? Alle aktuellen Statistiken werden zurückgesetzt.')) {
            this.state.reset();
            this.render();
            this.state.saveLocal();
            this.syncToServer();
            console.log('[ScoutEngine] New match started');
        }
    }

    /**
     * Show help modal with keyboard shortcuts
     */
    showHelpModal() {
        // Check if legacy modal implementation exists
        if (window.scoutEngine?.showHelpModal) {
            window.scoutEngine.showHelpModal();
            return;
        }

        // Simple fallback: alert with shortcuts
        alert(
            'Quick-Scout Tastenkürzel:\n\n' +
            '1-9: Spieler auswählen\n' +
            'A: Aufschlag\n' +
            'S: Annahme\n' +
            'G: Angriff\n' +
            'B: Block\n' +
            'F: Feldabwehr\n' +
            'R: Freeball\n' +
            '0-3: Bewertung vergeben\n' +
            'Z: Rückgängig\n' +
            'ESC: Auswahl aufheben'
        );
    }

    /**
     * Export match data as JSON file
     */
    exportData() {
        const data = this.state.toJSON();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = (this.state.matchName || 'scout_export').replace(/[^a-zA-Z0-9]/g, '_');
        a.download = `${safeName}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('[ScoutEngine] Data exported');
    }
}

// Export for ES6 module usage
export { ScoutEngineModular, ScoutState, ScoutAPI, ScoutKeyboard, ScoutStats };

// Initialize when DOM is ready (if loaded as module)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScout);
} else {
    initScout();
}

function initScout() {
    // Use hash-based navigation detection
    const isStatisticsPage = () => {
        const hash = window.location.hash;
        const page = document.getElementById('page-statistics');
        return hash === '#statistics' || (page && page.classList.contains('active'));
    };

    // Create engine instance on demand
    window.addEventListener('hashchange', () => {
        if (isStatisticsPage() && !window.scoutEngineModular) {
            window.scoutEngineModular = new ScoutEngineModular();
            window.scoutEngineModular.init();
        }
    });

    // Check on load
    if (isStatisticsPage()) {
        window.scoutEngineModular = new ScoutEngineModular();
        window.scoutEngineModular.init();
    }
}
