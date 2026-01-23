package stores

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
	"github.com/volleybratans/moblin-relay/models"
)

// MatchdayStore manages persistent storage of matchday state
type MatchdayStore struct {
	dataDir     string
	currentFile string
	state       *models.MatchdayState
	mu          sync.RWMutex
}

// NewMatchdayStore creates a new matchday store
func NewMatchdayStore(dataDir string) (*MatchdayStore, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	store := &MatchdayStore{
		dataDir:     dataDir,
		currentFile: filepath.Join(dataDir, "matchday-current.json"),
	}

	if err := store.load(); err != nil {
		store.state = &models.MatchdayState{
			Version:     1,
			LastUpdated: time.Now().UTC().Format(time.RFC3339),
			HomeTeam:    "Heim",
			AwayTeam:    "Gast",
			Date:        time.Now().Format("2006-01-02"),
		}
	}

	return store, nil
}

func (s *MatchdayStore) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := ioutil.ReadFile(s.currentFile)
	if err != nil {
		return err
	}

	var state models.MatchdayState
	if err := json.Unmarshal(data, &state); err != nil {
		return err
	}

	s.state = &state
	return nil
}

func (s *MatchdayStore) save() error {
	data, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(s.currentFile, data, 0644)
}

func (s *MatchdayStore) GetState() models.MatchdayState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.state == nil {
		return models.MatchdayState{}
	}
	return *s.state
}

func (s *MatchdayStore) UpdateState(newState models.MatchdayState) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	newState.Version = s.state.Version + 1
	newState.LastUpdated = time.Now().UTC().Format(time.RFC3339)
	s.state = &newState

	return s.save()
}

// ParseDVV fetches a DVV ticker URL and attempts to extract match info
// TODO: Move this to a separate service package as per Moneyball patterns
func (s *MatchdayStore) ParseDVV(urlStr string) (models.MatchdayState, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get(urlStr)
	if err != nil {
		return models.MatchdayState{}, fmt.Errorf("fetch failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return models.MatchdayState{}, fmt.Errorf("status code %d", resp.StatusCode)
	}

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return models.MatchdayState{}, err
	}
	html := string(bodyBytes)

	titleRegex := regexp.MustCompile(`<title>(.*?)<\/title>`)
	titleMatch := titleRegex.FindStringSubmatch(html)
	
	home := ""
	away := ""
	matchDate := ""

	if len(titleMatch) > 1 {
		title := titleMatch[1]
		parts := strings.Split(title, " vs. ")
		if len(parts) < 2 {
			parts = strings.Split(title, " - ")
		}
		
		if len(parts) >= 2 {
			home = strings.TrimSpace(parts[0])
			awayParts := strings.Split(parts[1], "-")
			away = strings.TrimSpace(awayParts[0])
		}
	}
	
	dateRegex := regexp.MustCompile(`(\d{2})\.(\d{2})\.(\d{4})`)
	dateMatch := dateRegex.FindStringSubmatch(html)
	if len(dateMatch) > 3 {
		matchDate = fmt.Sprintf("%s-%s-%s", dateMatch[3], dateMatch[2], dateMatch[1])
	} else {
		matchDate = time.Now().Format("2006-01-02")
	}
	
	uuidRegex := regexp.MustCompile(`\/stream\/([a-zA-Z0-9-]+)`)
	uuidMatch := uuidRegex.FindStringSubmatch(urlStr)
	matchId := ""
	if len(uuidMatch) > 1 {
		matchId = uuidMatch[1]
	}

	return models.MatchdayState{
		HomeTeam: home,
		AwayTeam: away,
		Date:     matchDate,
		MatchID:  matchId,
		DvvLink:  urlStr,
	}, nil
}
