package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"github.com/volleybratans/moblin-relay/models"
)

// MatchdayStore interface for dependency injection
type MatchdayStore interface {
	GetState() models.MatchdayState
	UpdateState(newState models.MatchdayState) error
	ParseDVV(url string) (models.MatchdayState, error)
}

// Broadcaster interface for sending updates to connected clients
type Broadcaster interface {
	Broadcast(msg []byte)
}

// MatchdayHandler handles matchday-related HTTP endpoints
type MatchdayHandler struct {
	store       MatchdayStore
	broadcaster Broadcaster
}

// NewMatchdayHandler creates a new matchday handler
func NewMatchdayHandler(store MatchdayStore, broadcaster Broadcaster) *MatchdayHandler {
	return &MatchdayHandler{
		store:       store,
		broadcaster: broadcaster,
	}
}

// HandleAPI handles GET/POST for matchday configuration
func (h *MatchdayHandler) HandleAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "GET":
		state := h.store.GetState()
		json.NewEncoder(w).Encode(state)

	case "POST":
		var newState models.MatchdayState
		if err := json.NewDecoder(r.Body).Decode(&newState); err != nil {
			http.Error(w, `{"error": "Invalid JSON"}`, http.StatusBadRequest)
			return
		}

		if err := h.store.UpdateState(newState); err != nil {
			http.Error(w, `{"error": "Failed to save state"}`, http.StatusInternalServerError)
			return
		}

		updatedState := h.store.GetState()
		log.Printf("[MATCHDAY] State updated (version %d)", updatedState.Version)

		// Broadcast update to all connected browsers
		if h.broadcaster != nil {
			broadcastMsg := map[string]interface{}{
				"type":    "matchday_update",
				"version": updatedState.Version,
				"data":    updatedState,
			}
			broadcastData, _ := json.Marshal(broadcastMsg)
			h.broadcaster.Broadcast(broadcastData)
		}

		json.NewEncoder(w).Encode(updatedState)

	default:
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// HandleParse fetches and parses a DVV link
func (h *MatchdayHandler) HandleParse(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	url := r.URL.Query().Get("url")
	if url == "" {
		http.Error(w, `{"error": "Missing url parameter"}`, http.StatusBadRequest)
		return
	}

	result, err := h.store.ParseDVV(url)
	if err != nil {
		log.Printf("[MATCHDAY] Parse error: %v", err)
		http.Error(w, fmt.Sprintf(`{"error": "%v"}`, err), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(result)
}
