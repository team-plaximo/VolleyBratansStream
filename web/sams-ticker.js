/**
 * SAMS Ticker Service - Real-time DVV/SBVV Match Data
 * Fetches live match data from the official SAMS backend API
 * 
 * @description Service for integrating official SBVV volleyball ticker data
 * @version 1.0.0
 */

class SamsTickerService {
    /**
     * @param {string} matchId - UUID of the match to track
     * @param {Object} options - Configuration options
     * @param {number} options.pollInterval - Polling interval in ms (default: 5000)
     * @param {boolean} options.autoStart - Start polling immediately (default: false)
     */
    constructor(matchId, options = {}) {
        this.matchId = matchId;
        this.pollInterval = options.pollInterval || 5000;
        this.autoStart = options.autoStart || false;

        this.apiUrl = 'https://backend.sams-ticker.de/live/indoor/tickers/dvv';

        this.matchData = null;
        this.rawData = null;
        this.polling = false;
        this.pollTimer = null;
        this.listeners = [];
        this.errorListeners = [];
        this.lastUpdate = null;

        if (this.autoStart) {
            this.start();
        }
    }

    /**
     * Start polling for match data
     */
    start() {
        if (this.polling) return;
        this.polling = true;
        this._poll();
        console.log(`[SamsTickerService] Started polling for match ${this.matchId}`);
    }

    /**
     * Stop polling
     */
    stop() {
        this.polling = false;
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
        console.log(`[SamsTickerService] Stopped polling`);
    }

    /**
     * Subscribe to data updates
     * @param {Function} callback - Called with (matchData, rawData) on each update
     * @returns {Function} Unsubscribe function
     */
    onUpdate(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Subscribe to errors
     * @param {Function} callback - Called with (error) on fetch errors
     * @returns {Function} Unsubscribe function
     */
    onError(callback) {
        this.errorListeners.push(callback);
        return () => {
            this.errorListeners = this.errorListeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Get current match data (cached)
     * @returns {Object|null} The mapped match data or null
     */
    getMatchData() {
        return this.matchData;
    }

    /**
     * Get all available matches from API
     * @returns {Promise<Array>} Array of match objects with id and team names
     */
    async getAvailableMatches() {
        try {
            const response = await fetch(this.apiUrl);
            const data = await response.json();

            const matches = [];
            data.matchDays?.forEach(day => {
                day.matches?.forEach(match => {
                    matches.push({
                        id: match.id,
                        home: match.teamDescription1,
                        away: match.teamDescription2,
                        date: day.date,
                        time: match.startTime,
                        hasLiveState: !!data.matchStates[match.id],
                        series: match.matchSeries
                    });
                });
            });

            return matches;
        } catch (error) {
            console.error('[SamsTickerService] Failed to fetch matches:', error);
            return [];
        }
    }

    /**
     * Change the match being tracked
     * @param {string} newMatchId - UUID of the new match
     */
    setMatchId(newMatchId) {
        this.matchId = newMatchId;
        this.matchData = null;
        if (this.polling) {
            this._poll(); // Immediate poll for new match
        }
    }

    /**
     * Internal: Polling loop
     */
    async _poll() {
        if (!this.polling) return;

        try {
            await this._fetchAndUpdate();
        } catch (error) {
            console.error('[SamsTickerService] Poll error:', error);
            this._notifyError(error);
        }

        // Schedule next poll
        if (this.polling) {
            this.pollTimer = setTimeout(() => this._poll(), this.pollInterval);
        }
    }

    /**
     * Internal: Fetch data and update state
     */
    async _fetchAndUpdate() {
        const response = await fetch(this.apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.rawData = data;

        // Find our match
        const matchData = this._mapMatchData(data, this.matchId);

        if (matchData) {
            const hasChanged = JSON.stringify(matchData) !== JSON.stringify(this.matchData);
            this.matchData = matchData;
            this.lastUpdate = new Date();

            if (hasChanged) {
                this._notifyListeners();
            }
        }
    }

    /**
     * Internal: Map SAMS data to our format
     */
    _mapMatchData(data, matchId) {
        // Find match in matchDays
        let match = null;
        let matchDate = null;

        data.matchDays?.forEach(day => {
            day.matches?.forEach(m => {
                if (m.id === matchId) {
                    match = m;
                    matchDate = day.date;
                }
            });
        });

        if (!match) {
            console.warn(`[SamsTickerService] Match ${matchId} not found in API response`);
            return null;
        }

        // Get live state
        const state = data.matchStates?.[matchId] || {};

        // Get statistics if available
        const stats = data.matchStats?.[matchId] || null;

        // Get series info for logos
        const series = data.matchSeries?.find(s => s.id === match.matchSeries);

        // Find team logos
        let homeLogo = null;
        let awayLogo = null;

        if (series?.teams) {
            // Match team names to find correct logos
            series.teams.forEach(team => {
                if (team.name === match.teamDescription1 || team.shortName === match.team1Short) {
                    homeLogo = team.logoImage200 || team.logoImage100;
                }
                if (team.name === match.teamDescription2 || team.shortName === match.team2Short) {
                    awayLogo = team.logoImage200 || team.logoImage100;
                }
            });
        }

        // Map set history
        const setHistory = (state.matchSets || []).map(set => ({
            home: set.team1,
            away: set.team2
        }));

        // Calculate current points from last set or state
        let currentPoints = { home: 0, away: 0 };
        if (state.currentPoints) {
            currentPoints = {
                home: state.currentPoints.team1 || 0,
                away: state.currentPoints.team2 || 0
            };
        } else if (setHistory.length > 0) {
            // Use last set if no current points
            const lastSet = setHistory[setHistory.length - 1];
            currentPoints = lastSet;
        }

        // Determine match status
        let status = 'upcoming';
        if (state.matchUuid) {
            status = state.matchEnded ? 'finished' : 'live';
        }

        // Get event history/timeline
        const eventHistory = data.eventHistories?.[matchId] || [];
        const timeline = eventHistory.slice(-10).map(event => ({
            type: event.type,
            team: event.team,
            time: event.timestamp,
            description: this._formatEventDescription(event)
        }));

        // Check for special states
        const isMatchball = eventHistory.some(e => e.type === 'MATCH_BALL');
        const isSatzball = eventHistory.some(e => e.type === 'SET_BALL');

        return {
            id: matchId,
            teams: {
                home: match.teamDescription1,
                away: match.teamDescription2
            },
            logos: {
                home: homeLogo,
                away: awayLogo
            },
            sets: {
                home: state.setPoints?.team1 || 0,
                away: state.setPoints?.team2 || 0
            },
            setHistory,
            currentPoints,
            serving: state.serving === 'team1' ? 'home' : (state.serving === 'team2' ? 'away' : null),
            status,
            date: matchDate,
            startTime: match.startTime,
            series: series?.name || '',
            isMatchball,
            isSatzball,
            timeline,
            hasStats: !!stats,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Internal: Format event description
     */
    _formatEventDescription(event) {
        switch (event.type) {
            case 'POINT':
                return `Punkt für ${event.team === 'team1' ? 'Heim' : 'Gast'}`;
            case 'START_TIMEOUT':
                return `Auszeit ${event.team === 'team1' ? 'Heim' : 'Gast'}`;
            case 'SUBSTITUTION':
                return `Wechsel: ${event.playerIn} für ${event.playerOut}`;
            case 'SET_BALL':
                return 'Satzball!';
            case 'MATCH_BALL':
                return 'Matchball!';
            default:
                return event.type;
        }
    }

    /**
     * Internal: Notify update listeners
     */
    _notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.matchData, this.rawData);
            } catch (e) {
                console.error('[SamsTickerService] Listener error:', e);
            }
        });
    }

    /**
     * Internal: Notify error listeners
     */
    _notifyError(error) {
        this.errorListeners.forEach(callback => {
            try {
                callback(error);
            } catch (e) {
                console.error('[SamsTickerService] Error listener error:', e);
            }
        });
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SamsTickerService = SamsTickerService;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SamsTickerService;
}
