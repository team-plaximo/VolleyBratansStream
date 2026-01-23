/**
 * Scout Keyboard Module - Keyboard Shortcuts
 * Handles quick-scout keyboard input mode
 * 
 * @module ScoutKeyboard
 */

export class ScoutKeyboard {
    constructor(options = {}) {
        this.state = options.state || null;
        this.onScoreAdded = options.onScoreAdded || null;
        this.onUndo = options.onUndo || null;
        this.onRender = options.onRender || null;

        // Quick-mode state
        this.quickMode = {
            playerIndex: null,
            element: null
        };

        // Element key mappings
        this.elementKeys = {
            'a': 'aufschlag',
            's': 'annahme',
            'g': 'angriff',
            'b': 'block',
            'f': 'feldabwehr',
            'r': 'freeball'
        };

        this._keydownHandler = null;
        this.indicatorEl = null;
    }

    /**
     * Initialize keyboard shortcuts
     */
    init() {
        this.createIndicator();
        this.attachListeners();
    }

    /**
     * Create the quick-mode indicator bar
     */
    createIndicator() {
        // Check if already exists
        if (document.getElementById('quickIndicator')) {
            this.indicatorEl = document.getElementById('quickIndicator');
            return;
        }

        const indicator = document.createElement('div');
        indicator.id = 'quickIndicator';
        indicator.className = 'scout-quick-indicator hidden';
        indicator.innerHTML = `
            <span class="indicator-step">
                <span class="indicator-label">Spieler:</span>
                <span class="indicator-value" id="indPlayer">-</span>
            </span>
            <span class="indicator-step">
                <span class="indicator-label">Element:</span>
                <span class="indicator-value" id="indElement">-</span>
            </span>
            <span class="indicator-step">
                <span class="indicator-label">Wertung:</span>
                <span class="indicator-value" id="indScore">0-3</span>
            </span>
            <button class="indicator-reset" id="indReset">ESC</button>
        `;

        // Find statistics page or body
        const container = document.getElementById('page-statistics') ||
            document.querySelector('.scout-match-header') ||
            document.body;
        container.insertBefore(indicator, container.firstChild);

        this.indicatorEl = indicator;

        // Reset button
        const resetBtn = document.getElementById('indReset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
    }

    /**
     * Attach keyboard event listeners
     */
    attachListeners() {
        // Remove existing handler if any
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
        }

        this._keydownHandler = (e) => {
            // Don't capture if input/textarea focused
            if (this.isInputFocused()) return;

            const key = e.key.toLowerCase();

            // Escape - reset selection
            if (key === 'escape') {
                this.reset();
                return;
            }

            // Z - Undo last action
            if (key === 'z' && !e.ctrlKey && !e.metaKey) {
                if (this.onUndo) {
                    this.onUndo();
                }
                return;
            }

            // ? - Show help
            if (key === '?') {
                // Trigger help modal if available
                if (window.scoutEngine?.showHelpModal) {
                    window.scoutEngine.showHelpModal();
                }
                return;
            }

            // Step 1: Player selection (1-9)
            if (/^[1-9]$/.test(key) && this.quickMode.playerIndex === null) {
                const index = parseInt(key) - 1;
                this.selectPlayer(index);
                e.preventDefault();
                return;
            }

            // Step 2: Element selection (a, s, g, b, f, r)
            if (this.elementKeys[key] && this.quickMode.playerIndex !== null && !this.quickMode.element) {
                this.selectElement(this.elementKeys[key]);
                e.preventDefault();
                return;
            }

            // Step 3: Score input (0-3)
            if (/^[0-3]$/.test(key) && this.quickMode.playerIndex !== null && this.quickMode.element) {
                this.addScore(parseInt(key));
                e.preventDefault();
                return;
            }
        };

        document.addEventListener('keydown', this._keydownHandler);
    }

    /**
     * Check if an input field is focused
     */
    isInputFocused() {
        const active = document.activeElement;
        if (!active) return false;

        const tagName = active.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
            return true;
        }

        if (active.isContentEditable) {
            return true;
        }

        // Check for common form classes
        const classList = active.classList;
        const formClasses = ['input', 'form-control', 'form-input', 'sb-team-input', 'scout-match-input'];
        return formClasses.some(cls => classList.contains(cls));
    }

    /**
     * Select a player by index
     */
    selectPlayer(index) {
        if (!this.state || !this.state.players) return;

        if (index >= 0 && index < this.state.players.length) {
            this.quickMode.playerIndex = index;
            this.updateIndicator();
            this.updateVisualSelection();
        }
    }

    /**
     * Select an element
     */
    selectElement(element) {
        this.quickMode.element = element;
        this.updateIndicator();
        this.updateVisualSelection();
    }

    /**
     * Add score via keyboard
     */
    addScore(score) {
        if (!this.state || !this.state.players) return;

        const player = this.state.players[this.quickMode.playerIndex];
        if (!player) return;

        const success = this.state.addScore(player.id, this.quickMode.element, score);

        if (success) {
            this.showFeedback(`${player.name}: ${this.getElementLabel(this.quickMode.element)} = ${score}`);

            if (this.onScoreAdded) {
                this.onScoreAdded(player.id, this.quickMode.element, score);
            }
        }

        // Reset for next input
        this.reset();

        if (this.onRender) {
            this.onRender();
        }
    }

    /**
     * Get readable element label
     */
    getElementLabel(element) {
        const labels = {
            'aufschlag': 'Aufschlag',
            'annahme': 'Annahme',
            'angriff': 'Angriff',
            'block': 'Block',
            'feldabwehr': 'Feldabwehr',
            'freeball': 'Freeball'
        };
        return labels[element] || element;
    }

    /**
     * Reset quick-mode selection
     */
    reset() {
        this.quickMode.playerIndex = null;
        this.quickMode.element = null;
        this.updateIndicator();
        this.updateVisualSelection();
    }

    /**
     * Update the indicator bar display
     */
    updateIndicator() {
        if (!this.indicatorEl) return;

        const playerEl = document.getElementById('indPlayer');
        const elementEl = document.getElementById('indElement');

        if (this.quickMode.playerIndex !== null || this.quickMode.element !== null) {
            this.indicatorEl.classList.remove('hidden');
        } else {
            this.indicatorEl.classList.add('hidden');
        }

        // Update player display
        if (playerEl) {
            if (this.quickMode.playerIndex !== null && this.state?.players) {
                const player = this.state.players[this.quickMode.playerIndex];
                if (player) {
                    playerEl.textContent = player.number ? `#${player.number} ${player.name}` : player.name;
                    playerEl.classList.add('active');
                }
            } else {
                playerEl.textContent = '-';
                playerEl.classList.remove('active');
            }
        }

        // Update element display
        if (elementEl) {
            if (this.quickMode.element) {
                elementEl.textContent = this.getElementLabel(this.quickMode.element);
                elementEl.classList.add('active');
            } else {
                elementEl.textContent = '-';
                elementEl.classList.remove('active');
            }
        }
    }

    /**
     * Update visual selection highlighting in the table
     */
    updateVisualSelection() {
        // Clear all previous highlights
        document.querySelectorAll('.scout-row-selected, .scout-cell-selected').forEach(el => {
            el.classList.remove('scout-row-selected', 'scout-cell-selected');
        });

        if (this.quickMode.playerIndex === null) return;
        if (!this.state?.players) return;

        const player = this.state.players[this.quickMode.playerIndex];
        if (!player) return;

        // Highlight the player row
        const row = document.querySelector(`[data-player-id="${player.id}"]`);
        if (row) {
            row.classList.add('scout-row-selected');

            // Highlight the element cell if selected
            if (this.quickMode.element) {
                const cell = row.querySelector(`[data-element="${this.quickMode.element}"]`);
                if (cell) {
                    cell.classList.add('scout-cell-selected');
                }
            }
        }
    }

    /**
     * Show brief feedback message
     */
    showFeedback(message) {
        let feedback = document.getElementById('quickFeedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'quickFeedback';
            feedback.className = 'scout-quick-feedback';
            document.body.appendChild(feedback);
        }

        feedback.textContent = message;
        feedback.classList.add('visible');

        setTimeout(() => {
            feedback.classList.remove('visible');
        }, 1500);
    }

    /**
     * Cleanup event listeners
     */
    destroy() {
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }
    }
}

export default ScoutKeyboard;
