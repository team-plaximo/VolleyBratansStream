package models

// MatchdayState represents the central match configuration
type MatchdayState struct {
	Version     int64  `json:"version"`
	LastUpdated string `json:"lastUpdated"`
	HomeTeam    string `json:"homeTeam"`
	AwayTeam    string `json:"awayTeam"`
	Date        string `json:"date"`
	DvvLink     string `json:"dvvLink"`
	MatchID     string `json:"matchId"`
}

// ScoutState represents the scout data state
type ScoutState struct {
	Version     int64    `json:"version"`
	LastUpdated string   `json:"lastUpdated"`
	MatchName   string   `json:"matchName"`
	MatchDate   string   `json:"matchDate"`
	Players     []Player `json:"players"`
}

// Player represents a player in the scout system
type Player struct {
	ID       string           `json:"id"`
	Name     string           `json:"name"`
	Number   interface{}      `json:"number"` // Can be string or int
	Position string           `json:"position"`
	Active   bool             `json:"active"`
	Scores   map[string][]int `json:"scores"`
}
