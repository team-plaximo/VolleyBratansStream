package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
	"github.com/volleybratans/moblin-relay/models"
)

// ScoutStore interface for dependency injection
type ScoutStore interface {
	GetState() models.ScoutState
	GetVersion() int64
	UpdateState(newState models.ScoutState) error
	ArchiveMatch() error
}

// ScoutHandler handles scout-related HTTP endpoints
type ScoutHandler struct {
	store       ScoutStore
	broadcaster Broadcaster
}

// NewScoutHandler creates a new scout handler
func NewScoutHandler(store ScoutStore, broadcaster Broadcaster) *ScoutHandler {
	return &ScoutHandler{
		store:       store,
		broadcaster: broadcaster,
	}
}

// HandleAPI handles GET/POST for scout state
func (h *ScoutHandler) HandleAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "GET":
		state := h.store.GetState()
		json.NewEncoder(w).Encode(state)
		log.Printf("[SCOUT] State fetched (version %d)", state.Version)

	case "POST":
		var newState models.ScoutState
		if err := json.NewDecoder(r.Body).Decode(&newState); err != nil {
			http.Error(w, `{"error": "Invalid JSON"}`, http.StatusBadRequest)
			return
		}

		if err := h.store.UpdateState(newState); err != nil {
			http.Error(w, `{"error": "Failed to save state"}`, http.StatusInternalServerError)
			return
		}

		updatedState := h.store.GetState()
		log.Printf("[SCOUT] State updated (version %d)", updatedState.Version)

		// Broadcast update to all connected browsers via WebSocket
		if h.broadcaster != nil {
			broadcastMsg := map[string]interface{}{
				"type":    "scout_update",
				"version": updatedState.Version,
			}
			broadcastData, _ := json.Marshal(broadcastMsg)
			h.broadcaster.Broadcast(broadcastData)
		}

		json.NewEncoder(w).Encode(updatedState)

	default:
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// HandleVersion returns just the version number for sync checks
func (h *ScoutHandler) HandleVersion(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"version":   h.store.GetVersion(),
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// HandleArchive archives the current match and resets state
func (h *ScoutHandler) HandleArchive(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	if err := h.store.ArchiveMatch(); err != nil {
		http.Error(w, `{"error": "Failed to archive match"}`, http.StatusInternalServerError)
		return
	}

	log.Printf("[SCOUT] Match archived successfully")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"message": "Match archived successfully",
	})
}
