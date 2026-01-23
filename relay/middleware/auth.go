package middleware

import (
	"encoding/json"
	"net/http"
	"time"
	"github.com/volleybratans/moblin-relay/services"
)

type AuthMiddleware struct {
	AuthService *services.AuthService
}

func NewAuthMiddleware(as *services.AuthService) *AuthMiddleware {
	return &AuthMiddleware{AuthService: as}
}

func (m *AuthMiddleware) Protect(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := services.GetClientIP(r)
		userAgent := r.Header.Get("User-Agent")

		// Rate limit
		if !m.AuthService.RateLimiter.Allow(ip, 100, time.Minute) {
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{"error": "Too many requests"})
			return
		}

		// Bot block
		if services.IsBot(userAgent) {
			w.WriteHeader(http.StatusForbidden)
			return
		}

		// Session check
		sessionID := services.GetSessionID(r)
		session := m.AuthService.SessionStore.Get(sessionID)
		if session == nil {
			if r.Header.Get("Accept") == "application/json" {
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
			} else {
				http.Redirect(w, r, "/login.html", http.StatusFound)
			}
			return
		}

		m.AuthService.SessionStore.Touch(sessionID)
		next(w, r)
	}
}

func (m *AuthMiddleware) Public(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := services.GetClientIP(r)
		if !m.AuthService.RateLimiter.Allow(ip, 100, time.Minute) {
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		next(w, r)
	}
}
