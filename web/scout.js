/**
 * Volleyball Scout System - Live Statistik Engine
 * Based on Team Statistik Merkblatt
 * 
 * Bewertungsskala 0-3:
 * 3 = Perfekt / Direkter Punkt
 * 2 = Gut mit kleinen Mängeln
 * 1 = Ohne Wirkung
 * 0 = Fehler
 */

class ScoutEngine {
    constructor() {
        this.STORAGE_KEY = 'volleybratans_scout';
        this.ELEMENTS = ['aufschlag', 'annahme', 'angriff', 'block', 'feldabwehr', 'freeball'];

        // Thresholds based on Merkblatt
        this.THRESHOLDS = {
            good: 2.0,  // >= 2.0 = sehr gut (grün)
            ok: 1.0     // >= 1.0 = ok/gut (gelb), < 1.0 = schlecht (rot)
        };

        // PDF.js library loaded flag
        this.pdfJsLoaded = false;

        // Quick-Scout Mode (Keyboard shortcuts)
        this.quickMode = {
            selectedPlayerIndex: null,  // 0-8 (keys 1-9)
            selectedElement: null       // 'aufschlag', 'annahme', etc.
        };
        this.undoStack = []; // [{playerId, element, score}]
        this.ELEMENT_SHORTCUTS = {
            'a': 'aufschlag',
            's': 'annahme',     // S = Serve-Receive
            'g': 'angriff',     // G = aGriff
            'b': 'block',
            'f': 'feldabwehr',
            'r': 'freeball'     // R = fReeball
        };
        this.ELEMENT_LABELS = {
            'aufschlag': 'Aufschlag',
            'annahme': 'Annahme',
            'angriff': 'Angriff',
            'block': 'Block',
            'feldabwehr': 'Feldabwehr',
            'freeball': 'Freeball'
        };
        this.POSITIONS = {
            'Z': 'Zuspiel',
            'D': 'Diagonal',
            'AA': 'Außenannahme',
            'MB': 'Mittelblock',
            'L': 'Libero'
        };
        this.POSITION_KEYS = ['Z', 'D', 'AA', 'MB', 'L'];

        // Server sync configuration
        this.API_BASE = this.getApiBase();
        this.syncInterval = null;
        this.serverVersion = 0;
        this.isSyncing = false;
        this.offlineQueue = [];

        // Load data (will attempt server sync first)
        this.data = this.loadDataLocal();
        this.init();

        // Start server sync
        this.initServerSync();
    }

    /**
     * Determines the API base URL based on current location
     */
    getApiBase() {
        // If loaded from file://, assume local backend on 8080
        if (window.location.protocol === 'file:') {
            return 'http://localhost:8080';
        }

        // Special case for local dev with npx serve (default port 5000 or 3000 without proxy)
        // If we find we are on port 5000, we assume no proxy and point to relay.
        // If on 3000, it could be Nginx (proxied) or React Dev (needs proxy setup).
        // Let's assume 5000 is always unproxied.
        if (window.location.port === '5000') {
            // Reconstruct protocol + hostname + 8080
            return `${window.location.protocol}//${window.location.hostname}:8080`;
        }

        // If explicitly running on different dev port (e.g. 5000) and NOT proxied, 
        // one might need logic here, but for Docker/Nginx/Caddy, relative path is correct.
        // We return empty string to use current origin.
        return '';
    }

    /**
     * Load data from localStorage (fallback)
     */
    loadDataLocal() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.serverVersion = data.version || 0;
                return data;
            }
        } catch (e) {
            console.warn('Scout: Could not load local data', e);
        }

        return {
            version: 0,
            matchName: '',
            matchDate: new Date().toISOString().split('T')[0],
            players: []
        };
    }

    /**
     * Initialize server sync - fetch latest state on load
     */
    async initServerSync() {
        try {
            await this.syncFromServer();
            console.log('[Scout] Initial server sync complete');
        } catch (e) {
            console.warn('[Scout] Server not available, using local data:', e.message);
        }

        // Start polling for updates every 5 seconds
        this.syncInterval = setInterval(() => this.checkForUpdates(), 5000);

        // Sync on visibility change (tablet wake)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('[Scout] Page visible, syncing...');
                this.syncFromServer();
            }
        });

        // Sync on focus (window focus)
        window.addEventListener('focus', () => {
            this.syncFromServer();
        });
    }

    /**
     * Fetch state from server
     */
    async syncFromServer() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const response = await fetch(`${this.API_BASE}/api/scout`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const serverState = await response.json();

            // Only update if server has newer version
            if (serverState.version > this.serverVersion) {
                console.log(`[Scout] Server has newer version (${serverState.version} > ${this.serverVersion})`);

                // Convert server format to local format
                this.data = this.convertFromServerFormat(serverState);
                this.serverVersion = serverState.version;

                // Update localStorage
                this.saveDataLocal();

                // Re-render UI
                this.render();
            }
        } catch (e) {
            console.warn('[Scout] Could not sync from server:', e.message);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Check for version updates (lightweight poll)
     */
    async checkForUpdates() {
        try {
            const response = await fetch(`${this.API_BASE}/api/scout/version`);
            if (!response.ok) return;

            const { version } = await response.json();
            if (version > this.serverVersion) {
                await this.syncFromServer();
            }
        } catch (e) {
            // Silently fail on poll errors
        }
    }

    /**
     * Convert server format to local format
     */
    convertFromServerFormat(serverState) {
        return {
            version: serverState.version,
            matchName: serverState.matchName || '',
            matchDate: serverState.matchDate || new Date().toISOString().split('T')[0],
            players: (serverState.players || []).map(p => ({
                id: p.id || Date.now() + Math.random(),
                number: p.number,
                name: p.name,
                stats: p.scores || {}
            }))
        };
    }

    /**
     * Convert local format to server format
     */
    convertToServerFormat() {
        return {
            matchName: this.data.matchName,
            matchDate: this.data.matchDate,
            players: this.data.players.map(p => ({
                id: String(p.id),
                number: p.number,
                name: p.name,
                scores: p.stats
            }))
        };
    }

    /**
     * Save data locally to localStorage
     */
    saveDataLocal() {
        try {
            this.data.version = this.serverVersion;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Scout: Could not save local data', e);
        }
    }

    /**
     * Save data - syncs to server and local
     */
    saveData() {
        // Always save locally first
        this.saveDataLocal();

        // Sync to server
        this.syncToServer();
    }

    /**
     * Push state to server
     */
    async syncToServer() {
        try {
            const serverData = this.convertToServerFormat();

            const response = await fetch(`${this.API_BASE}/api/scout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serverData)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const updatedState = await response.json();
            this.serverVersion = updatedState.version;
            console.log(`[Scout] Synced to server (version ${this.serverVersion})`);

            // Update local with new version
            this.data.version = this.serverVersion;
            this.saveDataLocal();

        } catch (e) {
            console.warn('[Scout] Could not sync to server:', e.message);
            // Queue for later sync
            this.offlineQueue.push(Date.now());
        }
    }

    init() {
        // DOM References
        this.tableBody = document.getElementById('scoutTableBody');
        this.tableFoot = document.getElementById('scoutTableFoot');
        this.emptyState = document.getElementById('scoutEmptyState');
        this.matchNameInput = document.getElementById('scoutMatchName');
        this.matchDateSpan = document.getElementById('scoutMatchDate');

        // Summary elements
        this.killRatioEl = document.getElementById('scoutKillRatio');
        this.receptionPctEl = document.getElementById('scoutReceptionPct');
        this.acesEl = document.getElementById('scoutAces');
        this.ueEl = document.getElementById('scoutUE');

        if (!this.tableBody) {
            console.log('Scout: Elements not found, page not active');
            return;
        }

        // Set initial values
        this.matchNameInput.value = this.data.matchName;
        this.matchDateSpan.textContent = this.formatDate(this.data.matchDate);

        // Event Listeners
        this.matchNameInput.addEventListener('input', () => {
            this.data.matchName = this.matchNameInput.value;
            this.saveData();
        });

        document.getElementById('scoutAddPlayer')?.addEventListener('click', () => this.showImportModal());
        document.getElementById('scoutAddPlayerEmpty')?.addEventListener('click', () => this.showImportModal());
        document.getElementById('scoutNewMatch')?.addEventListener('click', () => this.newMatch());
        document.getElementById('scoutHelp')?.addEventListener('click', () => this.showHelpModal());
        document.getElementById('scoutExport')?.addEventListener('click', () => this.exportData());

        // Initial render
        this.render();

        // Initialize Quick-Scout keyboard shortcuts
        this.initKeyboardShortcuts();
        this.createQuickIndicator();

        // Initialize drag and drop for player reordering
        this.initDragAndDrop();
    }

    formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }

    addPlayer(name, number = null) {
        if (!name || !name.trim()) return;

        const player = {
            id: Date.now() + Math.random(),
            number: number,
            name: name.trim(),
            stats: {}
        };

        // Initialize stats for each element
        this.ELEMENTS.forEach(el => {
            player.stats[el] = [];
        });

        this.data.players.push(player);
        this.saveData();
        this.render();
    }

    addPlayers(playersArray) {
        // Bulk add players without re-rendering after each
        playersArray.forEach(p => {
            const player = {
                id: Date.now() + Math.random(),
                number: p.number || null,
                name: p.name.trim(),
                stats: {}
            };
            this.ELEMENTS.forEach(el => {
                player.stats[el] = [];
            });
            this.data.players.push(player);
        });
        this.saveData();
        this.render();
    }

    removePlayer(playerId) {
        this.data.players = this.data.players.filter(p => p.id !== playerId);
        this.saveData();
        this.render();
    }

    addScore(playerId, element, score) {
        const player = this.data.players.find(p => p.id === playerId);
        if (!player) return;

        player.stats[element].push(score);
        this.saveData();
        this.render();
    }

    undoLastScore(playerId, element) {
        const player = this.data.players.find(p => p.id === playerId);
        if (!player || player.stats[element].length === 0) return;

        player.stats[element].pop();
        this.saveData();
        this.render();
    }

    calculateAverage(scores) {
        if (!scores || scores.length === 0) return null;
        const sum = scores.reduce((a, b) => a + b, 0);
        return sum / scores.length;
    }

    getAverageClass(avg) {
        if (avg === null) return '';
        if (avg >= this.THRESHOLDS.good) return 'avg-good';
        if (avg >= this.THRESHOLDS.ok) return 'avg-ok';
        return 'avg-bad';
    }

    getValueClass(value, threshold) {
        if (value >= 50) return 'value-good';
        if (value >= 40) return 'value-ok';
        return 'value-bad';
    }

    render() {
        if (!this.tableBody) return;

        const hasPlayers = this.data.players.length > 0;

        // Toggle empty state
        if (this.emptyState) {
            this.emptyState.classList.toggle('hidden', hasPlayers);
        }

        // Render player rows
        this.tableBody.innerHTML = this.data.players.map(player => this.renderPlayerRow(player)).join('');

        // Render team footer
        if (hasPlayers) {
            this.tableFoot.innerHTML = this.renderTeamRow();
        } else {
            this.tableFoot.innerHTML = '';
        }

        // Update summary cards
        this.updateSummary();

        // Re-attach event listeners
        this.attachRowListeners();
    }

    renderPlayerRow(player) {
        const cells = this.ELEMENTS.map(el => {
            const scores = player.stats[el];
            const avg = this.calculateAverage(scores);
            const avgDisplay = avg !== null ? avg.toFixed(1) : '--';
            const avgClass = this.getAverageClass(avg);
            const count = scores.length;

            return `
                <td>
                    <div class="scout-cell">
                        <div class="scout-cell-buttons">
                            <button class="scout-score-btn" data-player="${player.id}" data-element="${el}" data-score="3">3</button>
                            <button class="scout-score-btn" data-player="${player.id}" data-element="${el}" data-score="2">2</button>
                            <button class="scout-score-btn" data-player="${player.id}" data-element="${el}" data-score="1">1</button>
                            <button class="scout-score-btn" data-player="${player.id}" data-element="${el}" data-score="0">0</button>
                        </div>
                        <div class="scout-cell-stats" data-player="${player.id}" data-element="${el}" title="Klicken für Historie">
                            <span class="scout-cell-avg ${avgClass}">${avgDisplay}</span>
                            <span class="scout-cell-count">${count} Aktionen</span>
                        </div>
                    </div>
                </td>
            `;
        }).join('');

        // Keyboard shortcut badge (always visible for first 9 players)
        const playerIndex = this.data.players.findIndex(p => p.id === player.id);
        const keyboardKey = playerIndex < 9 ? playerIndex + 1 : null;
        const keyBadge = keyboardKey ? `<span class="scout-key-badge" title="Taste ${keyboardKey}">${keyboardKey}</span>` : '';

        // Jersey number badge (clickable to edit)
        const numberBadge = player.number
            ? `<span class="scout-player-number scout-number-edit" data-player-id="${player.id}" title="Klicken zum Bearbeiten">#${player.number}</span>`
            : `<span class="scout-player-number scout-number-add" data-player-id="${player.id}" title="Nummer hinzufügen">+#</span>`;

        // Position Badge (Clickable)
        const position = player.position || '?';
        const positionBadge = `<span class="scout-position-badge scout-pos-${position}" data-player-id="${player.id}" title="Position: ${this.POSITIONS[player.position] || 'Unbekannt'} (Klicken zum Ändern)">${position}</span>`;

        // Active Status (Starting 6)
        const activeClass = player.active ? 'scout-starting-six' : '';
        const activeToggle = `<div class="scout-active-toggle ${player.active ? 'active' : ''}" data-player-id="${player.id}" title="Startaufstellung / Aktiv"></div>`;

        // Libero Class
        const liberoClass = player.position === 'L' ? 'scout-libero' : '';

        return `
            <tr data-player-id="${player.id}" class="${activeClass} ${liberoClass}" draggable="true">
                <td class="scout-td-player">
                    <div class="scout-player-row-content">
                        ${activeToggle}
                        <div class="scout-player-info">
                            <span class="scout-drag-handle" title="Ziehen zum Verschieben">⋮⋮</span>
                            ${keyBadge}
                            ${numberBadge}
                            <span class="scout-player-name">${this.escapeHtml(player.name)}</span>
                            ${positionBadge}
                        </div>
                    </div>
                </td>
                ${cells}
                <td>
                    <div class="scout-player-actions">
                        <button class="scout-player-delete" data-delete="${player.id}" title="Spieler entfernen">
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

    renderTeamRow() {
        const totals = {};
        this.ELEMENTS.forEach(el => {
            const allScores = this.data.players.flatMap(p => p.stats[el]);
            totals[el] = {
                avg: this.calculateAverage(allScores),
                count: allScores.length
            };
        });

        const cells = this.ELEMENTS.map(el => {
            const { avg, count } = totals[el];
            const avgDisplay = avg !== null ? avg.toFixed(1) : '--';
            const avgClass = this.getAverageClass(avg);

            return `
                <td>
                    <span class="scout-cell-avg ${avgClass}">${avgDisplay}</span>
                    <span class="scout-cell-count">${count}</span>
                </td>
            `;
        }).join('');

        return `
            <tr>
                <td class="scout-td-player">TEAM</td>
                ${cells}
                <td></td>
            </tr>
        `;
    }

    updateSummary() {
        // Calculate Kill Ratio (Angriff: 3er / total)
        const angriffScores = this.data.players.flatMap(p => p.stats.angriff);
        const angriffKills = angriffScores.filter(s => s === 3).length;
        const killRatio = angriffScores.length > 0
            ? Math.round((angriffKills / angriffScores.length) * 100)
            : null;

        // Calculate Reception % (Annahme: 3er / total)
        const annahmeScores = this.data.players.flatMap(p => p.stats.annahme);
        const perfectReceptions = annahmeScores.filter(s => s === 3).length;
        const receptionPct = annahmeScores.length > 0
            ? Math.round((perfectReceptions / annahmeScores.length) * 100)
            : null;

        // Count Aces (Aufschlag: 3er)
        const aufschlagScores = this.data.players.flatMap(p => p.stats.aufschlag);
        const aces = aufschlagScores.filter(s => s === 3).length;

        // Count Unforced Errors (all 0s across all elements)
        let ue = 0;
        this.data.players.forEach(p => {
            this.ELEMENTS.forEach(el => {
                ue += p.stats[el].filter(s => s === 0).length;
            });
        });

        // Update UI
        if (this.killRatioEl) {
            this.killRatioEl.textContent = killRatio !== null ? `${killRatio}%` : '--%';
            this.killRatioEl.className = 'scout-summary-value';
            if (killRatio !== null) {
                if (killRatio >= 50) this.killRatioEl.classList.add('value-good');
                else if (killRatio >= 40) this.killRatioEl.classList.add('value-ok');
                else this.killRatioEl.classList.add('value-bad');
            }
        }

        if (this.receptionPctEl) {
            this.receptionPctEl.textContent = receptionPct !== null ? `${receptionPct}%` : '--%';
            this.receptionPctEl.className = 'scout-summary-value';
            if (receptionPct !== null) {
                if (receptionPct >= 50) this.receptionPctEl.classList.add('value-good');
                else if (receptionPct >= 40) this.receptionPctEl.classList.add('value-ok');
                else this.receptionPctEl.classList.add('value-bad');
            }
        }

        if (this.acesEl) {
            this.acesEl.textContent = aces;
        }

        if (this.ueEl) {
            this.ueEl.textContent = ue;
            this.ueEl.className = 'scout-summary-value';
            // More UE is bad
            if (ue > 10) this.ueEl.classList.add('value-bad');
            else if (ue > 5) this.ueEl.classList.add('value-ok');
        }
    }

    attachRowListeners() {
        // Score buttons
        this.tableBody.querySelectorAll('.scout-score-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = parseFloat(e.target.dataset.player);
                const element = e.target.dataset.element;
                const score = parseInt(e.target.dataset.score);
                this.addScore(playerId, element, score);
            });
        });

        // Delete buttons
        this.tableBody.querySelectorAll('.scout-player-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = parseFloat(e.currentTarget.dataset.delete);
                if (confirm('Spieler wirklich entfernen? Alle Statistiken gehen verloren.')) {
                    this.removePlayer(playerId);
                }
            });
        });

        // Jersey number edit/add buttons
        this.tableBody.querySelectorAll('.scout-number-edit, .scout-number-add').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = parseFloat(e.currentTarget.dataset.playerId);
                this.showNumberEditModal(playerId);
            });
        });

        // Cell stats click for history modal
        this.tableBody.querySelectorAll('.scout-cell-stats').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const playerId = parseFloat(e.currentTarget.dataset.player);
                const element = e.currentTarget.dataset.element;
                this.showScoreHistoryModal(playerId, element);
            });
        });

        // Position Badge Click
        this.tableBody.querySelectorAll('.scout-position-badge').forEach(badge => {
            badge.addEventListener('click', (e) => {
                const playerId = parseFloat(e.currentTarget.dataset.playerId);
                this.cyclePlayerPosition(playerId);
            });
        });

        // Active Toggle Click
        this.tableBody.querySelectorAll('.scout-active-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const playerId = parseFloat(e.currentTarget.dataset.playerId);
                this.togglePlayerActive(playerId);
            });
        });
    }

    /**
     * Cycles through player positions: Z -> D -> AA -> MB -> L -> ?
     */
    cyclePlayerPosition(playerId) {
        const player = this.data.players.find(p => p.id === playerId);
        if (!player) return;

        const currentPos = player.position;
        let newPos = null;

        if (!currentPos) {
            newPos = this.POSITION_KEYS[0]; // Start with Z
        } else {
            const idx = this.POSITION_KEYS.indexOf(currentPos);
            if (idx >= 0 && idx < this.POSITION_KEYS.length - 1) {
                newPos = this.POSITION_KEYS[idx + 1];
            } else {
                newPos = null; // Reset to empty
            }
        }

        player.position = newPos;
        this.saveData();
        this.render();
    }

    /**
     * Toggles player active status (Starting 6)
     */
    togglePlayerActive(playerId) {
        const player = this.data.players.find(p => p.id === playerId);
        if (!player) return;

        player.active = !player.active;
        this.saveData();
        this.render();
    }

    /**
     * Show modal to edit player jersey number
     */
    showNumberEditModal(playerId) {
        const player = this.data.players.find(p => p.id === playerId);
        if (!player) return;

        const currentNumber = player.number || '';
        const newNumber = prompt(
            `Trikotnummer für ${player.name}:`,
            currentNumber
        );

        if (newNumber === null) return; // Cancelled

        // Parse and validate
        const parsed = newNumber.trim() === '' ? null : parseInt(newNumber);

        if (newNumber.trim() !== '' && (isNaN(parsed) || parsed < 0 || parsed > 99)) {
            alert('Bitte eine gültige Nummer zwischen 0 und 99 eingeben.');
            return;
        }

        // Update player number
        player.number = parsed;
        this.saveData();
        this.render();
    }

    // ==================== SCORE HISTORY MODAL ====================

    /**
     * Show modal with score history for a specific player/element
     */
    showScoreHistoryModal(playerId, element) {
        const player = this.data.players.find(p => p.id === playerId);
        if (!player) return;

        const scores = player.stats[element] || [];
        if (scores.length === 0) {
            // No scores to show
            return;
        }

        // Create modal if it doesn't exist
        let modal = document.getElementById('scoutHistoryModal');
        if (!modal) {
            modal = this.createScoreHistoryModal();
            document.body.appendChild(modal);
        }

        // Update modal content
        this.currentHistoryPlayer = playerId;
        this.currentHistoryElement = element;

        const avg = this.calculateAverage(scores);
        const avgDisplay = avg !== null ? avg.toFixed(1) : '--';
        const avgClass = this.getAverageClass(avg);
        const playerName = player.number ? `#${player.number} ${player.name}` : player.name;
        const elementLabel = this.ELEMENT_LABELS[element];

        // Header
        modal.querySelector('.scout-history-title').innerHTML = `
            <span class="scout-history-player">${this.escapeHtml(playerName)}</span>
            <span class="scout-history-element">${elementLabel}</span>
        `;
        modal.querySelector('.scout-history-summary').innerHTML = `
            <span class="scout-history-avg ${avgClass}">Ø ${avgDisplay}</span>
            <span class="scout-history-count">${scores.length} Aktionen</span>
        `;

        // Score list (newest first)
        const listEl = modal.querySelector('.scout-history-list');
        listEl.innerHTML = scores.map((score, index) => {
            const relativeIndex = scores.length - 1 - index; // Reverse for display
            const displayIndex = index; // Actual index in array
            return `
                <div class="scout-history-item" data-index="${displayIndex}">
                    <span class="scout-history-score scout-score-${score}">${score}</span>
                    <span class="scout-history-order">#${displayIndex + 1}</span>
                    <button class="scout-history-delete" data-index="${displayIndex}" title="Eintrag löschen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            `;
        }).reverse().join(''); // Reverse so newest is at top

        // Attach delete listeners
        listEl.querySelectorAll('.scout-history-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.deleteSpecificScore(playerId, element, index);
            });
        });

        modal.classList.remove('hidden');
    }

    /**
     * Create the score history modal element
     */
    createScoreHistoryModal() {
        const modal = document.createElement('div');
        modal.id = 'scoutHistoryModal';
        modal.className = 'modal-overlay hidden';
        modal.innerHTML = `
            <div class="modal scout-history-modal">
                <div class="modal-header">
                    <div class="scout-history-title"></div>
                    <button class="modal-close" id="scoutHistoryClose">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="scout-history-summary"></div>
                <div class="scout-history-list"></div>
                <div class="modal-actions">
                    <button class="btn-secondary" id="scoutHistoryDone">Fertig</button>
                </div>
            </div>
        `;

        // Close listeners
        modal.querySelector('#scoutHistoryClose').addEventListener('click', () => this.closeScoreHistoryModal());
        modal.querySelector('#scoutHistoryDone').addEventListener('click', () => this.closeScoreHistoryModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeScoreHistoryModal();
        });

        return modal;
    }

    /**
     * Close the score history modal
     */
    closeScoreHistoryModal() {
        const modal = document.getElementById('scoutHistoryModal');
        if (modal) modal.classList.add('hidden');
        this.currentHistoryPlayer = null;
        this.currentHistoryElement = null;
    }

    /**
     * Delete a specific score by index
     */
    deleteSpecificScore(playerId, element, index) {
        const player = this.data.players.find(p => p.id === playerId);
        if (!player || !player.stats[element]) return;

        const scores = player.stats[element];
        if (index < 0 || index >= scores.length) return;

        // Remove the score at the specific index
        scores.splice(index, 1);

        this.saveData();
        this.render();

        // Refresh the modal if it's still open
        if (scores.length > 0) {
            this.showScoreHistoryModal(playerId, element);
        } else {
            this.closeScoreHistoryModal();
        }
    }

    // ==================== DRAG AND DROP ====================

    /**
     * Initialize drag and drop for player rows
     */
    initDragAndDrop() {
        if (!this.tableBody) return;

        this.tableBody.addEventListener('dragstart', (e) => {
            const row = e.target.closest('tr[data-player-id]');
            if (!row) return;

            this.draggedPlayerId = parseFloat(row.dataset.playerId);
            row.classList.add('scout-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', row.dataset.playerId);
        });

        this.tableBody.addEventListener('dragend', (e) => {
            const row = e.target.closest('tr[data-player-id]');
            if (row) row.classList.remove('scout-dragging');
            this.draggedPlayerId = null;

            // Remove all drop indicators
            this.tableBody.querySelectorAll('.scout-drop-above, .scout-drop-below').forEach(el => {
                el.classList.remove('scout-drop-above', 'scout-drop-below');
            });
        });

        this.tableBody.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const row = e.target.closest('tr[data-player-id]');
            if (!row || parseFloat(row.dataset.playerId) === this.draggedPlayerId) return;

            // Remove previous indicators
            this.tableBody.querySelectorAll('.scout-drop-above, .scout-drop-below').forEach(el => {
                el.classList.remove('scout-drop-above', 'scout-drop-below');
            });

            // Show drop indicator
            const rect = row.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (e.clientY < midpoint) {
                row.classList.add('scout-drop-above');
            } else {
                row.classList.add('scout-drop-below');
            }
        });

        this.tableBody.addEventListener('dragleave', (e) => {
            const row = e.target.closest('tr[data-player-id]');
            if (row) {
                row.classList.remove('scout-drop-above', 'scout-drop-below');
            }
        });

        this.tableBody.addEventListener('drop', (e) => {
            e.preventDefault();

            const targetRow = e.target.closest('tr[data-player-id]');
            if (!targetRow || !this.draggedPlayerId) return;

            const targetPlayerId = parseFloat(targetRow.dataset.playerId);
            if (targetPlayerId === this.draggedPlayerId) return;

            // Find indices
            const fromIndex = this.data.players.findIndex(p => p.id === this.draggedPlayerId);
            const toIndex = this.data.players.findIndex(p => p.id === targetPlayerId);
            if (fromIndex === -1 || toIndex === -1) return;

            // Determine if dropping above or below
            const rect = targetRow.getBoundingClientRect();
            const dropAbove = e.clientY < rect.top + rect.height / 2;

            // Remove player from old position
            const [movedPlayer] = this.data.players.splice(fromIndex, 1);

            // Calculate new index
            let newIndex = toIndex;
            if (fromIndex < toIndex) {
                newIndex = dropAbove ? toIndex - 1 : toIndex;
            } else {
                newIndex = dropAbove ? toIndex : toIndex + 1;
            }

            // Insert at new position
            this.data.players.splice(newIndex, 0, movedPlayer);

            // Clean up
            targetRow.classList.remove('scout-drop-above', 'scout-drop-below');
            this.draggedPlayerId = null;

            // Save and re-render
            this.saveData();
            this.render();
        });
    }

    // ==================== IMPORT MODAL ====================

    showImportModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('scoutImportModal');
        if (!modal) {
            modal = this.createImportModal();
            document.body.appendChild(modal);
        }

        // Reset modal state
        this.resetImportModal();
        modal.classList.remove('hidden');
    }

    createImportModal() {
        const modal = document.createElement('div');
        modal.id = 'scoutImportModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal scout-import-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Spieler importieren</h3>
                    <button class="modal-close" id="scoutImportClose">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <div class="scout-import-tabs">
                    <button class="scout-import-tab active" data-tab="pdf">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        PDF Import
                    </button>
                    <button class="scout-import-tab" data-tab="manual">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="8.5" cy="7" r="4"/>
                            <line x1="20" y1="8" x2="20" y2="14"/>
                            <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                        Manuell
                    </button>
                    <button class="scout-import-tab" data-tab="presets">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        Presets
                    </button>
                </div>

                <div class="scout-import-content">
                    <!-- PDF Tab -->
                    <div class="scout-import-panel active" id="scoutImportPdfPanel">
                        <div class="scout-import-dropzone" id="scoutImportDropzone">
                            <svg class="icon-xl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <path d="M12 18v-6"/>
                                <path d="M9 15l3-3 3 3"/>
                            </svg>
                            <p class="dropzone-text">SBVV PDF hier ablegen</p>
                            <p class="dropzone-subtext">oder klicken zum Auswählen</p>
                            <input type="file" id="scoutPdfInput" accept=".pdf" hidden>
                        </div>
                        
                        <div class="scout-import-status hidden" id="scoutImportStatus">
                            <div class="scout-import-loading">
                                <div class="spinner"></div>
                                <span>PDF wird verarbeitet...</span>
                            </div>
                        </div>

                        <div class="scout-import-preview hidden" id="scoutImportPreview">
                            <div class="scout-import-preview-header">
                                <span class="scout-import-preview-title">Erkannte Spieler</span>
                                <span class="scout-import-preview-count" id="scoutImportCount">0</span>
                            </div>
                            <div class="scout-import-preview-list" id="scoutImportList">
                                <!-- Player checkboxes will be injected here -->
                            </div>
                            <div class="scout-import-preview-actions">
                                <button class="btn-secondary btn-sm" id="scoutImportSelectAll">Alle auswählen</button>
                                <button class="btn-secondary btn-sm" id="scoutImportDeselectAll">Alle abwählen</button>
                            </div>
                        </div>
                    </div>


                    <!-- Presets Tab -->
                    <div class="scout-import-panel" id="scoutImportPresetsPanel">
                        <div class="scout-import-presets">
                            <button class="btn-primary w-full" id="scoutLoadVCO" style="justify-content: flex-start; text-align: left; padding: 12px; height: auto;">
                                <div>
                                    <div style="font-weight: 600;">VolleyBratans</div>
                                    <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 2px;">Roland, Artem, Viktor, Samuel, Sergej, Alex, Linus, Lion, Nils</div>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div class="scout-import-panel" id="scoutImportManualPanel">
                        <div class="form-group">
                            <label class="form-label">Trikotnummer (optional)</label>
                            <input type="number" class="form-input scout-input-number" id="scoutManualNumber" placeholder="z.B. 11" min="1" max="99">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Spielername</label>
                            <input type="text" class="form-input" id="scoutManualName" placeholder="z.B. Müller, Max">
                        </div>
                    </div>
                </div>

                <div class="modal-actions">
                    <button class="btn-secondary" id="scoutImportCancel">Abbrechen</button>
                    <button class="btn-primary" id="scoutImportConfirm">Spieler hinzufügen</button>
                </div>
            </div>
        `;

        // Attach event listeners
        this.attachImportModalListeners(modal);

        return modal;
    }

    attachImportModalListeners(modal) {
        // Close button
        modal.querySelector('#scoutImportClose').addEventListener('click', () => this.closeImportModal());
        modal.querySelector('#scoutImportCancel').addEventListener('click', () => this.closeImportModal());

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeImportModal();
        });

        // Tab switching
        modal.querySelectorAll('.scout-import-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.switchImportTab(targetTab);
            });
        });

        // PDF dropzone
        const dropzone = modal.querySelector('#scoutImportDropzone');
        const fileInput = modal.querySelector('#scoutPdfInput');

        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                this.handlePdfFile(file);
            }
        });
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handlePdfFile(file);
        });

        // Select/Deselect all
        modal.querySelector('#scoutImportSelectAll').addEventListener('click', () => {
            modal.querySelectorAll('.scout-import-checkbox').forEach(cb => cb.checked = true);
            this.updateImportCount();
        });
        modal.querySelector('#scoutImportDeselectAll').addEventListener('click', () => {
            modal.querySelectorAll('.scout-import-checkbox').forEach(cb => cb.checked = false);
            this.updateImportCount();
        });

        // Confirm button
        modal.querySelector('#scoutImportConfirm').addEventListener('click', () => this.confirmImport());

        // Preset buttons
        const vcoBtn = modal.querySelector('#scoutLoadVCO');
        if (vcoBtn) {
            vcoBtn.addEventListener('click', () => {
                this.loadVCOPreset();
                this.closeImportModal();
            });
        }
    }

    switchImportTab(tab) {
        const modal = document.getElementById('scoutImportModal');

        // Update tab buttons
        modal.querySelectorAll('.scout-import-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Update panels
        modal.querySelector('#scoutImportPdfPanel').classList.toggle('active', tab === 'pdf');
        modal.querySelector('#scoutImportManualPanel').classList.toggle('active', tab === 'manual');
        const presetsPanel = modal.querySelector('#scoutImportPresetsPanel');
        if (presetsPanel) presetsPanel.classList.toggle('active', tab === 'presets');

        // Update confirm button text
        const confirmBtn = modal.querySelector('#scoutImportConfirm');
        if (tab === 'manual') {
            confirmBtn.textContent = 'Spieler hinzufügen';
        } else {
            this.updateImportCount();
        }
    }

    resetImportModal() {
        const modal = document.getElementById('scoutImportModal');
        if (!modal) return;

        // Reset to PDF tab
        this.switchImportTab('pdf');

        // Reset dropzone
        modal.querySelector('#scoutImportDropzone').classList.remove('hidden');
        modal.querySelector('#scoutImportStatus').classList.add('hidden');
        modal.querySelector('#scoutImportPreview').classList.add('hidden');
        modal.querySelector('#scoutPdfInput').value = '';

        // Reset manual form
        modal.querySelector('#scoutManualNumber').value = '';
        modal.querySelector('#scoutManualName').value = '';

        // Reset parsed players
        this.parsedPlayers = [];
    }

    loadVCOPreset() {
        // Roland (Z), Artem (Z), Viktor (AA), Samuel (AA), Sergej (AA), Alex (MB), Linus (D), Lion (L), Nils (L)
        const players = [
            { name: 'Roland', position: 'Z' },
            { name: 'Artem', position: 'Z' },
            { name: 'Viktor', position: 'AA' },
            { name: 'Samuel', position: 'AA' },
            { name: 'Sergej', position: 'AA' },
            { name: 'Alex', position: 'MB' },
            { name: 'Linus', position: 'D' },
            { name: 'Lion', position: 'L' },
            { name: 'Nils', position: 'L' }
        ];

        if (confirm('VolleyBratans Preset laden?')) {
            players.forEach(p => {
                this.addPlayer(p.name, null, p.position);
            });
            this.render();
        }
    }

    closeImportModal() {
        const modal = document.getElementById('scoutImportModal');
        if (modal) modal.classList.add('hidden');
    }

    async handlePdfFile(file) {
        const modal = document.getElementById('scoutImportModal');
        const dropzone = modal.querySelector('#scoutImportDropzone');
        const status = modal.querySelector('#scoutImportStatus');
        const preview = modal.querySelector('#scoutImportPreview');

        // Show loading state
        dropzone.classList.add('hidden');
        status.classList.remove('hidden');

        try {
            // Load PDF.js if not loaded
            if (!window.pdfjsLib) {
                await this.loadPdfJs();
            }

            // Parse PDF
            const players = await this.parseSbvvPdf(file);
            this.parsedPlayers = players;

            // Show preview
            status.classList.add('hidden');
            preview.classList.remove('hidden');

            this.renderPlayerPreview(players);
        } catch (error) {
            console.error('PDF parsing error:', error);
            status.innerHTML = `
                <div class="scout-import-error">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <span>Fehler beim Verarbeiten der PDF</span>
                </div>
            `;
        }
    }

    async loadPdfJs() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async parseSbvvPdf(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const players = [];

        // Parse all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');

            // Split by common patterns to get lines
            const lines = text.split(/(?=\d{1,2}\s+[A-ZÄÖÜ][a-zäöüß]+,)/g);

            for (const line of lines) {
                // Match pattern: Number Name, FirstName (e.g., "11 Bindemann, Roland")
                const match = line.match(/^(\d{1,2})\s+([A-ZÄÖÜ][a-zäöüß]+,\s*[A-ZÄÖÜ][a-zäöüß]+)/);
                if (match) {
                    players.push({
                        number: parseInt(match[1]),
                        name: match[2].trim()
                    });
                }
            }
        }

        // Remove duplicates by number
        const seen = new Set();
        return players.filter(p => {
            if (seen.has(p.number)) return false;
            seen.add(p.number);
            return true;
        });
    }

    renderPlayerPreview(players) {
        const list = document.getElementById('scoutImportList');

        if (players.length === 0) {
            list.innerHTML = '<p class="scout-import-empty">Keine Spieler erkannt</p>';
            return;
        }

        list.innerHTML = players.map((p, i) => `
            <label class="scout-import-item">
                <input type="checkbox" class="scout-import-checkbox" data-index="${i}" checked>
                <span class="scout-import-number">${p.number}</span>
                <span class="scout-import-name">${this.escapeHtml(p.name)}</span>
            </label>
        `).join('');

        // Add change listeners
        list.querySelectorAll('.scout-import-checkbox').forEach(cb => {
            cb.addEventListener('change', () => this.updateImportCount());
        });

        this.updateImportCount();
    }

    updateImportCount() {
        const modal = document.getElementById('scoutImportModal');
        const checkboxes = modal.querySelectorAll('.scout-import-checkbox:checked');
        const count = checkboxes.length;

        modal.querySelector('#scoutImportCount').textContent = count;
        modal.querySelector('#scoutImportConfirm').textContent =
            count === 1 ? '1 Spieler importieren' : `${count} Spieler importieren`;
    }

    confirmImport() {
        const modal = document.getElementById('scoutImportModal');
        const activeTab = modal.querySelector('.scout-import-tab.active').dataset.tab;

        if (activeTab === 'manual') {
            // Manual add
            const number = modal.querySelector('#scoutManualNumber').value;
            const name = modal.querySelector('#scoutManualName').value;

            if (name.trim()) {
                this.addPlayer(name, number ? parseInt(number) : null);
                this.closeImportModal();
            }
        } else {
            // PDF import
            const checkboxes = modal.querySelectorAll('.scout-import-checkbox:checked');
            const playersToAdd = [];

            checkboxes.forEach(cb => {
                const index = parseInt(cb.dataset.index);
                if (this.parsedPlayers[index]) {
                    playersToAdd.push(this.parsedPlayers[index]);
                }
            });

            if (playersToAdd.length > 0) {
                this.addPlayers(playersToAdd);
            }
            this.closeImportModal();
        }
    }

    // ==================== OLD METHODS (RENAMED) ====================

    showAddPlayerModal() {
        // Redirect to new import modal
        this.showImportModal();
    }

    newMatch() {
        if (this.data.players.length > 0) {
            if (!confirm('Neues Spiel starten? Aktuelle Statistiken werden gelöscht.')) {
                return;
            }
        }

        // Reset all stats but keep players
        this.data.players.forEach(player => {
            this.ELEMENTS.forEach(el => {
                player.stats[el] = [];
            });
        });

        this.data.matchName = '';
        this.data.matchDate = new Date().toISOString().split('T')[0];

        if (this.matchNameInput) {
            this.matchNameInput.value = '';
        }
        if (this.matchDateSpan) {
            this.matchDateSpan.textContent = this.formatDate(this.data.matchDate);
        }

        this.saveData();
        this.render();
    }

    exportData() {
        const exportObj = {
            match: this.data.matchName || 'Unbenanntes Spiel',
            date: this.data.matchDate,
            exportedAt: new Date().toISOString(),
            players: this.data.players.map(p => {
                const playerExport = {
                    number: p.number,
                    name: p.name,
                    stats: {}
                };

                this.ELEMENTS.forEach(el => {
                    const scores = p.stats[el];
                    const avg = this.calculateAverage(scores);
                    playerExport.stats[el] = {
                        scores: scores,
                        count: scores.length,
                        average: avg !== null ? parseFloat(avg.toFixed(2)) : null
                    };
                });

                return playerExport;
            }),
            summary: {
                killRatio: this.calculateKillRatio(),
                receptionPct: this.calculateReceptionPct(),
                aces: this.countAces(),
                unforcedErrors: this.countUE()
            }
        };

        // Create and download JSON file
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scout_${this.data.matchName || 'match'}_${this.data.matchDate}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    calculateKillRatio() {
        const scores = this.data.players.flatMap(p => p.stats.angriff);
        const kills = scores.filter(s => s === 3).length;
        return scores.length > 0 ? Math.round((kills / scores.length) * 100) : null;
    }

    calculateReceptionPct() {
        const scores = this.data.players.flatMap(p => p.stats.annahme);
        const perfect = scores.filter(s => s === 3).length;
        return scores.length > 0 ? Math.round((perfect / scores.length) * 100) : null;
    }

    countAces() {
        return this.data.players.flatMap(p => p.stats.aufschlag).filter(s => s === 3).length;
    }

    countUE() {
        let ue = 0;
        this.data.players.forEach(p => {
            this.ELEMENTS.forEach(el => {
                ue += p.stats[el].filter(s => s === 0).length;
            });
        });
        return ue;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== HELP MODAL ====================

    showHelpModal() {
        let modal = document.getElementById('scoutHelpModal');
        if (!modal) {
            modal = this.createHelpModal();
            document.body.appendChild(modal);
        }
        modal.classList.remove('hidden');
    }

    createHelpModal() {
        const modal = document.createElement('div');
        modal.id = 'scoutHelpModal';
        modal.className = 'modal-overlay hidden';
        modal.innerHTML = `
            <div class="modal scout-help-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Scout Hilfe & Anleitung</h3>
                    <button class="modal-close" id="scoutHelpClose">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <div class="scout-help-content">
                    <div class="scout-help-section">
                        <h4>Bewertungsskala</h4>
                        <div class="scout-help-scores">
                            <div class="scout-help-score-item">
                                <span class="scout-score-badge scout-score-3">3</span>
                                <div><strong>Perfekt / Punkt</strong><br><span class="text-xs text-muted">Direkter Punkt oder perfekter Pass</span></div>
                            </div>
                            <div class="scout-help-score-item">
                                <span class="scout-score-badge scout-score-2">2</span>
                                <div><strong>Gut</strong><br><span class="text-xs text-muted">Gute Aktion mit kleinen Mängeln</span></div>
                            </div>
                            <div class="scout-help-score-item">
                                <span class="scout-score-badge scout-score-1">1</span>
                                <div><strong>Ohne Wirkung</strong><br><span class="text-xs text-muted">Im Spiel gehalten / Weiterleitungsfehler</span></div>
                            </div>
                            <div class="scout-help-score-item">
                                <span class="scout-score-badge scout-score-0">0</span>
                                <div><strong>Fehler</strong><br><span class="text-xs text-muted">Punkt für Gegner</span></div>
                            </div>
                        </div>
                    </div>

                    <div class="scout-help-section">
                        <h4>Tastaturkürzel (Quick-Scout)</h4>
                        <div class="scout-help-shortcuts">
                            <div class="shortcut-group">
                                <kbd>1</kbd> - <kbd>9</kbd>
                                <span>Spieler wählen</span>
                            </div>
                            <div class="shortcut-group">
                                <kbd>A</kbd> <kbd>S</kbd> <kbd>G</kbd> <kbd>B</kbd> <kbd>F</kbd> <kbd>R</kbd>
                                <span>Element wählen</span>
                            </div>
                            <div class="shortcut-group">
                                <kbd>0</kbd> - <kbd>3</kbd>
                                <span>Wertung eingeben</span>
                            </div>
                            <div class="shortcut-group">
                                <kbd>Z</kbd>
                                <span>Rückgängig (Undo)</span>
                            </div>
                        </div>
                        <p class="scout-help-hint">Reihenfolge: Spieler -> Element -> Wertung (z.B. "1" -> "A" -> "3")</p>
                    </div>

                    <div class="scout-help-section">
                        <h4>Tipps</h4>
                        <ul class="scout-help-list">
                            <li><strong>Historie:</strong> Klicke auf eine Zelle (Durchschnitt), um alle Bewertungen zu sehen und zu korrigieren.</li>
                            <li><strong>Nummer ändern:</strong> Klicke auf die Trikotnummer (#).</li>
                            <li><strong>Verschieben:</strong> Ziehe Spieler an den Punkten (⋮⋮) um sie zu sortieren.</li>
                        </ul>
                    </div>
                </div>

                <div class="modal-actions">
                    <button class="btn-primary" id="scoutHelpDone">Verstanden</button>
                </div>
            </div>
        `;

        // Listeners
        modal.querySelector('#scoutHelpClose').addEventListener('click', () => this.closeHelpModal());
        modal.querySelector('#scoutHelpDone').addEventListener('click', () => this.closeHelpModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeHelpModal();
        });

        return modal;
    }

    closeHelpModal() {
        const modal = document.getElementById('scoutHelpModal');
        if (modal) modal.classList.add('hidden');
    }

    // ==================== QUICK-SCOUT MODE ====================

    /**
     * Create the Quick-Mode indicator bar
     */
    createQuickIndicator() {
        // Remove existing indicator if any
        const existing = document.getElementById('scoutQuickIndicator');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.id = 'scoutQuickIndicator';
        indicator.className = 'scout-quick-indicator hidden';
        indicator.innerHTML = `
            <div class="scout-quick-status">
                <span class="scout-quick-label">Spieler:</span>
                <span class="scout-quick-value" id="quickPlayerName">-</span>
            </div>
            <div class="scout-quick-status">
                <span class="scout-quick-label">Element:</span>
                <span class="scout-quick-value" id="quickElementName">-</span>
            </div>
            <div class="scout-quick-hint" id="quickHint">
                Drücke 1-9 für Spieler
            </div>
        `;

        // Insert before the scout table container
        const tableContainer = document.querySelector('.scout-table-container');
        if (tableContainer) {
            tableContainer.parentNode.insertBefore(indicator, tableContainer);
        }
    }

    /**
     * Initialize keyboard shortcuts
     */
    initKeyboardShortcuts() {
        // Remove any existing listener to avoid duplicates on re-init
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
        }

        this._keydownHandler = (e) => {
            // Ignore if modal is open or input is focused
            if (this.isInputFocused()) return;

            // Ignore if not on statistics page
            const statsPage = document.getElementById('page-statistics');
            if (!statsPage || !statsPage.classList.contains('active')) return;

            const key = e.key.toLowerCase();

            // Player selection (1-9)
            if (e.key >= '1' && e.key <= '9' && !this.quickMode.selectedPlayerIndex !== null && !this.quickMode.selectedElement) {
                const index = parseInt(e.key) - 1;
                if (index < this.data.players.length) {
                    this.selectPlayer(index);
                    e.preventDefault();
                }
                return;
            }

            // Element selection (A/S/G/B/F/R)
            if (this.ELEMENT_SHORTCUTS[key] && this.quickMode.selectedPlayerIndex !== null) {
                this.selectElement(this.ELEMENT_SHORTCUTS[key]);
                e.preventDefault();
                return;
            }

            // Score input (0-3) when both player and element are selected
            if (this.quickMode.selectedPlayerIndex !== null &&
                this.quickMode.selectedElement !== null) {
                if (['0', '1', '2', '3'].includes(e.key)) {
                    this.addScoreViaKeyboard(parseInt(e.key));
                    e.preventDefault();
                    return;
                }
            }

            // Undo (Z)
            if (key === 'z' && !e.ctrlKey && !e.metaKey) {
                this.undoLastAction();
                e.preventDefault();
                return;
            }

            // ESC to reset selection
            if (e.key === 'Escape') {
                this.resetQuickMode();
                e.preventDefault();
                return;
            }

            // Help (?)
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                this.showHelpModal();
                e.preventDefault();
                return;
            }

            // Player selection fallback - if no element selected yet, allow number keys
            if (e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key) - 1;
                if (index < this.data.players.length) {
                    this.selectPlayer(index);
                    e.preventDefault();
                }
            }
        };

        document.addEventListener('keydown', this._keydownHandler);
    }

    /**
     * Check if an input field is focused
     */
    isInputFocused() {
        const activeEl = document.activeElement;
        if (!activeEl) return false;

        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
            return true;
        }
        if (activeEl.contentEditable === 'true') {
            return true;
        }

        // Check if modal is open
        const modal = document.getElementById('scoutImportModal');
        if (modal && !modal.classList.contains('hidden')) {
            return true;
        }

        return false;
    }

    /**
     * Select a player by index
     */
    selectPlayer(index) {
        if (index >= 0 && index < this.data.players.length) {
            this.quickMode.selectedPlayerIndex = index;
            this.quickMode.selectedElement = null; // Reset element when changing player
            this.updateQuickIndicator();
            this.updateVisualSelection();
        }
    }

    /**
     * Select an element
     */
    selectElement(element) {
        if (this.ELEMENTS.includes(element)) {
            this.quickMode.selectedElement = element;
            this.updateQuickIndicator();
            this.updateVisualSelection();
        }
    }

    /**
     * Add score via keyboard
     */
    addScoreViaKeyboard(score) {
        const playerIndex = this.quickMode.selectedPlayerIndex;
        const element = this.quickMode.selectedElement;

        if (playerIndex === null || !element) return;

        const player = this.data.players[playerIndex];
        if (!player) return;

        // Add to undo stack before making change
        this.undoStack.push({
            playerId: player.id,
            element: element,
            score: score
        });

        // Keep stack limited to 10 entries
        if (this.undoStack.length > 10) {
            this.undoStack.shift();
        }

        // Add the score
        this.addScore(player.id, element, score);

        // Reset quick mode after score entry
        this.resetQuickMode();

        // Show brief success feedback
        this.showQuickFeedback(`+${score} ${this.ELEMENT_LABELS[element]}`);
    }

    /**
     * Undo the last action
     */
    undoLastAction() {
        if (this.undoStack.length === 0) {
            this.showQuickFeedback('Nichts zum Rückgängig machen');
            return;
        }

        const lastAction = this.undoStack.pop();
        this.undoLastScore(lastAction.playerId, lastAction.element);
        this.showQuickFeedback(`Rückgängig: ${lastAction.score} ${this.ELEMENT_LABELS[lastAction.element]}`);
    }

    /**
     * Reset quick mode selection
     */
    resetQuickMode() {
        this.quickMode.selectedPlayerIndex = null;
        this.quickMode.selectedElement = null;
        this.updateQuickIndicator();
        this.updateVisualSelection();
    }

    /**
     * Update the quick indicator bar
     */
    updateQuickIndicator() {
        const indicator = document.getElementById('scoutQuickIndicator');
        const playerNameEl = document.getElementById('quickPlayerName');
        const elementNameEl = document.getElementById('quickElementName');
        const hintEl = document.getElementById('quickHint');

        if (!indicator) return;

        const hasSelection = this.quickMode.selectedPlayerIndex !== null || this.quickMode.selectedElement !== null;
        indicator.classList.toggle('hidden', !hasSelection && this.data.players.length === 0);

        // Show indicator when on stats page with players
        if (this.data.players.length > 0) {
            indicator.classList.remove('hidden');
        }

        // Update player name
        if (this.quickMode.selectedPlayerIndex !== null) {
            const player = this.data.players[this.quickMode.selectedPlayerIndex];
            if (player) {
                const num = player.number ? `#${player.number} ` : '';
                playerNameEl.textContent = num + player.name;
                playerNameEl.classList.add('active');
            }
        } else {
            playerNameEl.textContent = '-';
            playerNameEl.classList.remove('active');
        }

        // Update element name
        if (this.quickMode.selectedElement) {
            elementNameEl.textContent = this.ELEMENT_LABELS[this.quickMode.selectedElement];
            elementNameEl.classList.add('active');
        } else {
            elementNameEl.textContent = '-';
            elementNameEl.classList.remove('active');
        }

        // Update hint text
        if (this.quickMode.selectedPlayerIndex === null) {
            hintEl.textContent = 'Drücke 1-9 für Spieler';
        } else if (this.quickMode.selectedElement === null) {
            hintEl.textContent = 'A/S/G/B/F/R für Element';
        } else {
            hintEl.textContent = 'Drücke 0-3 für Score';
        }
    }

    /**
     * Update visual selection highlighting in the table
     */
    updateVisualSelection() {
        // Remove all existing selections
        document.querySelectorAll('.scout-player-selected').forEach(el => {
            el.classList.remove('scout-player-selected');
        });
        document.querySelectorAll('.scout-element-selected').forEach(el => {
            el.classList.remove('scout-element-selected');
        });

        // Add selection to current player row
        if (this.quickMode.selectedPlayerIndex !== null) {
            const player = this.data.players[this.quickMode.selectedPlayerIndex];
            if (player) {
                const row = document.querySelector(`tr[data-player-id="${player.id}"]`);
                if (row) {
                    row.classList.add('scout-player-selected');

                    // Highlight specific element column if selected
                    if (this.quickMode.selectedElement) {
                        const elementIndex = this.ELEMENTS.indexOf(this.quickMode.selectedElement);
                        if (elementIndex >= 0) {
                            const cells = row.querySelectorAll('td');
                            // +1 because first cell is player name
                            if (cells[elementIndex + 1]) {
                                cells[elementIndex + 1].classList.add('scout-element-selected');
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Show brief feedback message
     */
    showQuickFeedback(message) {
        const indicator = document.getElementById('scoutQuickIndicator');
        if (!indicator) return;

        const hintEl = document.getElementById('quickHint');
        if (hintEl) {
            const originalText = hintEl.textContent;
            hintEl.textContent = message;
            hintEl.classList.add('scout-quick-feedback');

            setTimeout(() => {
                hintEl.classList.remove('scout-quick-feedback');
                this.updateQuickIndicator();
            }, 1500);
        }
    }
}

// Initialize Scout Engine when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.scoutEngine = new ScoutEngine();
});

// Re-initialize when navigating to statistics page (for SPA navigation)
document.addEventListener('pageChanged', (e) => {
    if (e.detail?.page === 'statistics') {
        window.scoutEngine = new ScoutEngine();
    }
});
