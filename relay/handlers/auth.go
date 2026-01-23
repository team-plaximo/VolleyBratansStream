package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
	"github.com/volleybratans/moblin-relay/services"
)

type AuthHandler struct {
	AuthService *services.AuthService
}

type LoginRequest struct {
	PIN string `json:"pin"`
}

type AuthResponse struct {
	Success       bool   `json:"success"`
	Message       string `json:"message,omitempty"`
	Authenticated bool   `json:"authenticated,omitempty"`
	ExpiresAt     string `json:"expires_at,omitempty"`
}

func NewAuthHandler(as *services.AuthService) *AuthHandler {
	return &AuthHandler{AuthService: as}
}

func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	ip := services.GetClientIP(r)
	if !h.AuthService.RateLimiter.Allow(ip+":login", 5, time.Minute) {
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(AuthResponse{Success: false, Message: "Too many attempts"})
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if req.PIN != h.AuthService.PIN {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(AuthResponse{Success: false, Message: "Invalid PIN"})
		return
	}

	session := h.AuthService.SessionStore.Create(r.Header.Get("User-Agent"), ip)
	services.SetSessionCookie(w, session.ID)

	json.NewEncoder(w).Encode(AuthResponse{
		Success:       true,
		Authenticated: true,
		ExpiresAt:     session.ExpiresAt.Format(time.RFC3339),
	})
}

func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if sessionID := services.GetSessionID(r); sessionID != "" {
		h.AuthService.SessionStore.Delete(sessionID)
	}
	services.ClearSessionCookie(w)
	json.NewEncoder(w).Encode(AuthResponse{Success: true})
}

func (h *AuthHandler) HandleSession(w http.ResponseWriter, r *http.Request) {
	sessionID := services.GetSessionID(r)
	session := h.AuthService.SessionStore.Get(sessionID)
	if session == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(AuthResponse{Authenticated: false})
		return
	}
	h.AuthService.SessionStore.Touch(sessionID)
	json.NewEncoder(w).Encode(AuthResponse{
		Success:       true,
		Authenticated: true,
		ExpiresAt:     session.ExpiresAt.Format(time.RFC3339),
	})
}
