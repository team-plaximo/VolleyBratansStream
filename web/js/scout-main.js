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

        // Build player rows
        let html = '';
        this.state.players.forEach((player, index) => {
            html += this.renderPlayerRow(player, index);
        });
        this.elements.tableBody.innerHTML = html;

        // Render team totals
        if (this.elements.tableFoot) {
            this.elements.tableFoot.innerHTML = this.renderTeamRow();
        }

        // Attach event listeners
        this.attachRowListeners();
    }

    /**
     * Render a single player row
     */
    renderPlayerRow(player, index) {
        const elements = ScoutState.ELEMENTS;
        const posClass = player.position ? `pos-${player.position}` : '';

        let cellsHtml = '';
        elements.forEach(el => {
            const scores = player.scores[el] || [];
            const avg = ScoutStats.calculateAverage(scores);
            const avgClass = ScoutStats.getAverageClass(avg);

            cellsHtml += `
                <td class="scout-cell" data-element="${el}" data-player="${player.id}">
                    <span class="scout-avg ${avgClass}" data-action="history">${avg}</span>
                    <span class="scout-count">${scores.length}</span>
                    <div class="scout-score-btns">
                        <button class="scout-score-btn scout-score-0" data-score="0">0</button>
                        <button class="scout-score-btn scout-score-1" data-score="1">1</button>
                        <button class="scout-score-btn scout-score-2" data-score="2">2</button>
                        <button class="scout-score-btn scout-score-3" data-score="3">3</button>
                    </div>
                </td>
            `;
        });

        return `
            <tr class="scout-row" data-player-id="${player.id}" data-index="${index}">
                <td class="scout-player-cell">
                    <div class="scout-player-info">
                        <span class="scout-active-toggle ${player.active ? 'active' : ''}" 
                              data-action="toggle-active" title="Startaufstellung"></span>
                        <span class="scout-player-number" data-action="edit-number">
                            ${player.number ? '#' + player.number : '#'}
                        </span>
                        <span class="scout-player-name">${this.escapeHtml(player.name)}</span>
                        <span class="scout-position-badge ${posClass}" data-action="cycle-position">
                            ${player.position || '?'}
                        </span>
                    </div>
                </td>
                ${cellsHtml}
                <td class="scout-actions-cell">
                    <button class="scout-player-delete" data-action="delete" title="Spieler entfernen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
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
                <td class="scout-cell scout-team-cell">
                    <span class="scout-avg ${avgClass}">${result.avg}</span>
                    <span class="scout-count">${result.count}</span>
                </td>
            `;
        });

        return `
            <tr class="scout-team-row">
                <td class="scout-player-cell"><strong>Team</strong></td>
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
            const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;
            const row = target.closest('.scout-row');
            const playerId = row?.dataset.playerId;

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
                    const cell = target.closest('.scout-cell');
                    if (cell) {
                        const element = cell.dataset.element;
                        this.showScoreHistoryModal(playerId, element);
                    }
                    break;
            }

            // Score button click
            const scoreBtn = target.closest('.scout-score-btn');
            if (scoreBtn) {
                const score = parseInt(scoreBtn.dataset.score);
                const cell = scoreBtn.closest('.scout-cell');
                const element = cell?.dataset.element;

                if (playerId && element !== undefined) {
                    this.state.addScore(playerId, element, score);
                    this.render();
                    this.state.saveLocal();
                    this.syncToServer();
                }
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
