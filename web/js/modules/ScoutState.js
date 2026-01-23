/**
 * Scout State Module - State Management
 * Handles players, scores, undo stack, and match data
 * 
 * @module ScoutState
 */

export class ScoutState {
    constructor(storageKey) {
        this.STORAGE_KEY = storageKey || 'volleybratans_scout';
        this.players = [];
        this.matchName = '';
        this.matchDate = new Date().toISOString().split('T')[0];
        this.undoStack = [];
        this.version = 0;
        this.lastServerVersion = 0;
        this.isDirty = false;
    }

    // Elements for volleyball statistics
    static get ELEMENTS() {
        return ['aufschlag', 'annahme', 'angriff', 'block', 'feldabwehr', 'freeball'];
    }

    // Position ordering
    static get POSITIONS() {
        return ['?', 'Z', 'D', 'AA', 'MB', 'L'];
    }

    /**
     * Create a new player object
     */
    createPlayer(name, number = null) {
        const player = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            name: name.trim(),
            number: number,
            position: null,
            active: false,
            scores: {}
        };

        // Initialize empty score arrays for each element
        ScoutState.ELEMENTS.forEach(el => {
            player.scores[el] = [];
        });

        return player;
    }

    /**
     * Add a player to the state
     */
    addPlayer(name, number = null) {
        if (!name || !name.trim()) return null;

        const player = this.createPlayer(name, number);
        this.players.push(player);
        this.markDirty();
        return player;
    }

    /**
     * Add multiple players at once
     */
    addPlayers(playersArray) {
        if (!Array.isArray(playersArray)) return [];

        const added = [];
        playersArray.forEach(p => {
            if (typeof p === 'string') {
                added.push(this.addPlayer(p));
            } else if (p && p.name) {
                added.push(this.addPlayer(p.name, p.number));
            }
        });

        return added.filter(Boolean);
    }

    /**
     * Remove a player by ID
     */
    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);
            this.markDirty();
            return true;
        }
        return false;
    }

    /**
     * Get a player by ID
     */
    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    /**
     * Add a score to a player's element
     */
    addScore(playerId, element, score) {
        const player = this.getPlayer(playerId);
        if (!player || !ScoutState.ELEMENTS.includes(element)) return false;

        if (!player.scores[element]) {
            player.scores[element] = [];
        }

        player.scores[element].push(score);

        // Add to undo stack
        this.addToUndoStack({
            type: 'score',
            playerId,
            element,
            score,
            timestamp: Date.now()
        });

        this.markDirty();
        return true;
    }

    /**
     * Remove the last score from a player's element
     */
    undoLastScore(playerId, element) {
        const player = this.getPlayer(playerId);
        if (!player || !player.scores[element] || player.scores[element].length === 0) {
            return false;
        }

        player.scores[element].pop();
        this.markDirty();
        return true;
    }

    /**
     * Delete a specific score by index
     */
    deleteScore(playerId, element, index) {
        const player = this.getPlayer(playerId);
        if (!player || !player.scores[element]) return false;

        if (index >= 0 && index < player.scores[element].length) {
            player.scores[element].splice(index, 1);
            this.markDirty();
            return true;
        }
        return false;
    }

    /**
     * Add action to undo stack
     */
    addToUndoStack(action) {
        this.undoStack.push(action);
        // Keep stack at reasonable size
        if (this.undoStack.length > 100) {
            this.undoStack.shift();
        }
    }

    /**
     * Pop last action from undo stack
     */
    popUndoStack() {
        return this.undoStack.pop();
    }

    /**
     * Update player's position
     */
    cyclePosition(playerId) {
        const player = this.getPlayer(playerId);
        if (!player) return null;

        const currentIndex = ScoutState.POSITIONS.indexOf(player.position || '?');
        const nextIndex = (currentIndex + 1) % ScoutState.POSITIONS.length;
        player.position = ScoutState.POSITIONS[nextIndex] === '?' ? null : ScoutState.POSITIONS[nextIndex];

        this.markDirty();
        return player.position;
    }

    /**
     * Toggle player's active status
     */
    toggleActive(playerId) {
        const player = this.getPlayer(playerId);
        if (!player) return false;

        player.active = !player.active;
        this.markDirty();
        return player.active;
    }

    /**
     * Update player's jersey number
     */
    setNumber(playerId, number) {
        const player = this.getPlayer(playerId);
        if (!player) return false;

        player.number = number;
        this.markDirty();
        return true;
    }

    /**
     * Mark state as dirty (needs sync)
     */
    markDirty() {
        this.isDirty = true;
        this.version++;
    }

    /**
     * Mark state as clean (synced)
     */
    markClean() {
        this.isDirty = false;
    }

    /**
     * Calculate average for a player's element
     */
    calculateAverage(scores) {
        if (!scores || scores.length === 0) return '--';
        const sum = scores.reduce((a, b) => a + b, 0);
        return (sum / scores.length).toFixed(2);
    }

    /**
     * Get average class based on value
     */
    getAverageClass(avg) {
        if (avg === '--') return '';
        const val = parseFloat(avg);
        if (val >= 2.5) return 'good';
        if (val >= 1.5) return 'average';
        return 'poor';
    }

    /**
     * Reset state for new match
     */
    reset() {
        this.players = [];
        this.matchName = '';
        this.matchDate = new Date().toISOString().split('T')[0];
        this.undoStack = [];
        this.version = 0;
        this.markDirty();
    }

    /**
     * Export state as JSON
     */
    toJSON() {
        return {
            players: this.players,
            matchName: this.matchName,
            matchDate: this.matchDate,
            version: this.version
        };
    }

    /**
     * Import state from JSON
     */
    fromJSON(data) {
        if (!data) return false;

        this.players = data.players || [];
        this.matchName = data.matchName || '';
        this.matchDate = data.matchDate || new Date().toISOString().split('T')[0];
        this.version = data.version || 0;

        // Ensure all players have proper structure
        this.players.forEach(player => {
            if (!player.scores) player.scores = {};
            ScoutState.ELEMENTS.forEach(el => {
                if (!player.scores[el]) player.scores[el] = [];
            });
        });

        return true;
    }

    /**
     * Save to localStorage
     */
    saveLocal() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.toJSON()));
            return true;
        } catch (e) {
            console.error('[ScoutState] Failed to save locally:', e);
            return false;
        }
    }

    /**
     * Load from localStorage
     */
    loadLocal() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return this.fromJSON(JSON.parse(stored));
            }
        } catch (e) {
            console.error('[ScoutState] Failed to load from localStorage:', e);
        }
        return false;
    }
}

export default ScoutState;
