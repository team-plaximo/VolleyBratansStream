/**
 * Scout State Store - Server-Side Persistence
 * Stores volleyball scout data with version tracking for multi-client sync
 */

package main

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// ScoutPlayer represents a player with their scouting data
type ScoutPlayer struct {
	ID      string              `json:"id"`
	Name    string              `json:"name"`
	Number  *int                `json:"number,omitempty"`
	Scores  map[string][]int    `json:"scores"`
}

// ScoutState represents the complete match scouting state
type ScoutState struct {
	Version     int64         `json:"version"`
	LastUpdated string        `json:"lastUpdated"`
	MatchName   string        `json:"matchName"`
	MatchDate   string        `json:"matchDate"`
	Players     []ScoutPlayer `json:"players"`
}

// ScoutStore manages persistent storage of scout state
type ScoutStore struct {
	dataDir     string
	currentFile string
	state       *ScoutState
	mu          sync.RWMutex
}

// NewScoutStore creates a new scout store with the given data directory
func NewScoutStore(dataDir string) (*ScoutStore, error) {
	// Ensure data directory exists
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}
	
	// Create archive subdirectory
	archiveDir := filepath.Join(dataDir, "archive")
	if err := os.MkdirAll(archiveDir, 0755); err != nil {
		return nil, err
	}

	store := &ScoutStore{
		dataDir:     dataDir,
		currentFile: filepath.Join(dataDir, "scout-current.json"),
	}

	// Load existing state or create new
	if err := store.load(); err != nil {
		// Create empty state
		store.state = &ScoutState{
			Version:     1,
			LastUpdated: time.Now().UTC().Format(time.RFC3339),
			MatchName:   "",
			MatchDate:   time.Now().Format("2006-01-02"),
			Players:     []ScoutPlayer{},
		}
	}

	return store, nil
}

// load reads state from disk
func (s *ScoutStore) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := ioutil.ReadFile(s.currentFile)
	if err != nil {
		return err
	}

	var state ScoutState
	if err := json.Unmarshal(data, &state); err != nil {
		return err
	}

	s.state = &state
	return nil
}

// save writes state to disk
func (s *ScoutStore) save() error {
	data, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(s.currentFile, data, 0644)
}

// GetState returns the current scout state
func (s *ScoutStore) GetState() ScoutState {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.state == nil {
		return ScoutState{
			Version:     0,
			LastUpdated: time.Now().UTC().Format(time.RFC3339),
			Players:     []ScoutPlayer{},
		}
	}

	return *s.state
}

// GetVersion returns just the current version number (for sync checks)
func (s *ScoutStore) GetVersion() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.state == nil {
		return 0
	}
	return s.state.Version
}

// UpdateState updates the scout state and increments version
func (s *ScoutStore) UpdateState(newState ScoutState) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Increment version
	newState.Version = s.state.Version + 1
	newState.LastUpdated = time.Now().UTC().Format(time.RFC3339)

	s.state = &newState

	return s.save()
}

// ArchiveMatch saves the current match to archive and resets state
func (s *ScoutStore) ArchiveMatch() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.state == nil || s.state.MatchName == "" {
		return nil // Nothing to archive
	}

	// Create archive filename
	archiveName := s.state.MatchDate + "_" + sanitizeFilename(s.state.MatchName) + ".json"
	archivePath := filepath.Join(s.dataDir, "archive", archiveName)

	// Save to archive
	data, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	if err := ioutil.WriteFile(archivePath, data, 0644); err != nil {
		return err
	}

	// Reset state for new match
	s.state = &ScoutState{
		Version:     1,
		LastUpdated: time.Now().UTC().Format(time.RFC3339),
		MatchName:   "",
		MatchDate:   time.Now().Format("2006-01-02"),
		Players:     []ScoutPlayer{},
	}

	return s.save()
}

// sanitizeFilename removes invalid characters from filename
func sanitizeFilename(name string) string {
	invalid := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|", " "}
	result := name
	for _, char := range invalid {
		result = replaceAll(result, char, "_")
	}
	return result
}

func replaceAll(s, old, new string) string {
	for i := 0; i < len(s); i++ {
		if i+len(old) <= len(s) && s[i:i+len(old)] == old {
			s = s[:i] + new + s[i+len(old):]
		}
	}
	return s
}
