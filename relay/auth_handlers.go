/**
 * Authentication HTTP Handlers
 * Login, logout, and session verification endpoints
 */

package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

// LoginRequest represents login request body
type LoginRequest struct {
	PIN string `json:"pin"`
}

// AuthResponse represents auth endpoint response
type AuthResponse struct {
	Success       bool   `json:"success"`
	Message       string `json:"message,omitempty"`
	Authenticated bool   `json:"authenticated,omitempty"`
	ExpiresAt     string `json:"expires_at,omitempty"`
}

// handleLogin processes login requests
func handleLogin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(AuthResponse{Success: false, Message: "Method not allowed"})
		return
	}

	ip := getClientIP(r)

	// Rate limit login attempts (5 per minute per IP)
	if !authConfig.RateLimiter.Allow(ip+":login", 5, time.Minute) {
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(AuthResponse{
			Success: false,
			Message: "Zu viele Anmeldeversuche. Bitte warte eine Minute.",
		})
		log.Printf("[AUTH] Rate limited login from %s", ip)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(AuthResponse{Success: false, Message: "Ungültige Anfrage"})
		return
	}

	// Verify PIN
	if req.PIN != authConfig.PIN {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(AuthResponse{Success: false, Message: "Falscher PIN"})
		log.Printf("[AUTH] Failed login attempt from %s", ip)
		return
	}

	// Create session
	userAgent := r.Header.Get("User-Agent")
	session := authConfig.SessionStore.Create(userAgent, ip)
	setSessionCookie(w, session)

	log.Printf("[AUTH] Successful login from %s", ip)
	json.NewEncoder(w).Encode(AuthResponse{
		Success:       true,
		Authenticated: true,
		ExpiresAt:     session.ExpiresAt.Format(time.RFC3339),
	})
}

// handleLogout clears the session
func handleLogout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get session and delete it
	if session := getSessionFromCookie(r); session != nil {
		authConfig.SessionStore.Delete(session.ID)
		log.Printf("[AUTH] Session logged out: %s...", session.ID[:8])
	}

	clearSessionCookie(w)

	json.NewEncoder(w).Encode(AuthResponse{
		Success: true,
		Message: "Abgemeldet",
	})
}

// handleSession checks session status
func handleSession(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	session := getSessionFromCookie(r)
	if session == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(AuthResponse{
			Success:       false,
			Authenticated: false,
			Message:       "Nicht eingeloggt",
		})
		return
	}

	// Touch session to update last used
	authConfig.SessionStore.Touch(session.ID)

	json.NewEncoder(w).Encode(AuthResponse{
		Success:       true,
		Authenticated: true,
		ExpiresAt:     session.ExpiresAt.Format(time.RFC3339),
	})
}

// authMiddleware protects routes requiring authentication
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)
		userAgent := r.Header.Get("User-Agent")

		// Rate limit all requests (100 per minute per IP)
		if !authConfig.RateLimiter.Allow(ip, 100, time.Minute) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Zu viele Anfragen. Bitte warte einen Moment.",
			})
			log.Printf("[SECURITY] Rate limited: %s", ip)
			return
		}

		// Block bots (unless health check)
		if isBot(userAgent) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Automated access not allowed",
			})
			log.Printf("[SECURITY] Bot blocked: %s (UA: %s)", ip, userAgent)
			return
		}

		// Check session
		session := getSessionFromCookie(r)
		if session == nil {
			// Redirect to login for HTML requests, 401 for API
			if r.Header.Get("Accept") == "application/json" || 
			   r.Header.Get("Content-Type") == "application/json" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{
					"error": "Nicht authentifiziert",
					"redirect": "/login.html",
				})
			} else {
				http.Redirect(w, r, "/login.html", http.StatusFound)
			}
			return
		}

		// Touch session
		authConfig.SessionStore.Touch(session.ID)

		next(w, r)
	}
}

// publicMiddleware for public endpoints (still rate limited)
func publicMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)
		userAgent := r.Header.Get("User-Agent")

		// Rate limit all requests
		if !authConfig.RateLimiter.Allow(ip, 100, time.Minute) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Too many requests",
			})
			return
		}

		// Block bots
		if isBot(userAgent) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Automated access not allowed",
			})
			return
		}

		next(w, r)
	}
}
