/**
 * Scout State Store - Server-Side Persistence
 * Stores volleyball scout data with version tracking
 */

package stores

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"sync"
	"time"
	"github.com/volleybratans/moblin-relay/models"
)

// ScoutStore manages persistent storage of scout state
type ScoutStore struct {
	dataDir     string
	currentFile string
	state       *models.ScoutState
	mu          sync.RWMutex
}

// NewScoutStore creates a new scout store
func NewScoutStore(dataDir string) (*ScoutStore, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}
	
	archiveDir := filepath.Join(dataDir, "archive")
	if err := os.MkdirAll(archiveDir, 0755); err != nil {
		return nil, err
	}

	store := &ScoutStore{
		dataDir:     dataDir,
		currentFile: filepath.Join(dataDir, "scout-current.json"),
	}

	if err := store.load(); err != nil {
		store.state = &models.ScoutState{
			Version:     1,
			LastUpdated: time.Now().UTC().Format(time.RFC3339),
			MatchName:   "",
			MatchDate:   time.Now().Format("2006-01-02"),
			Players:     []models.Player{},
		}
	}

	return store, nil
}

func (s *ScoutStore) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := ioutil.ReadFile(s.currentFile)
	if err != nil {
		return err
	}

	var state models.ScoutState
	if err := json.Unmarshal(data, &state); err != nil {
		return err
	}

	s.state = &state
	return nil
}

func (s *ScoutStore) save() error {
	data, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(s.currentFile, data, 0644)
}

func (s *ScoutStore) GetState() models.ScoutState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.state == nil {
		return models.ScoutState{
			Version:     0,
			LastUpdated: time.Now().UTC().Format(time.RFC3339),
			Players:     []models.Player{},
		}
	}
	return *s.state
}

func (s *ScoutStore) GetVersion() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.state == nil {
		return 0
	}
	return s.state.Version
}

func (s *ScoutStore) UpdateState(newState models.ScoutState) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	newState.Version = s.state.Version + 1
	newState.LastUpdated = time.Now().UTC().Format(time.RFC3339)
	s.state = &newState

	return s.save()
}

func (s *ScoutStore) ArchiveMatch() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.state == nil || s.state.MatchName == "" {
		return nil
	}

	archiveName := s.state.MatchDate + "_" + sanitizeFilename(s.state.MatchName) + ".json"
	archivePath := filepath.Join(s.dataDir, "archive", archiveName)

	data, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	if err := ioutil.WriteFile(archivePath, data, 0644); err != nil {
		return err
	}

	s.state = &models.ScoutState{
		Version:     1,
		LastUpdated: time.Now().UTC().Format(time.RFC3339),
		MatchName:   "",
		MatchDate:   time.Now().Format("2006-01-02"),
		Players:     []models.Player{},
	}

	return s.save()
}

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
