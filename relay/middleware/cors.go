package middleware

import (
	"net/http"
	"os"
	"strings"
)

// GetAllowedOrigins returns allowed CORS origins from environment
func GetAllowedOrigins() []string {
	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins == "" {
		// Development defaults
		return []string{"http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3000"}
	}
	return strings.Split(origins, ",")
}

// IsOriginAllowed checks if the request origin is in allowed list
func IsOriginAllowed(origin string) bool {
	allowed := GetAllowedOrigins()
	for _, o := range allowed {
		if strings.TrimSpace(o) == origin {
			return true
		}
	}
	return false
}

// CorsMiddleware adds CORS and security headers for API endpoints
func CorsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Security headers (always set)
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// CORS headers (only for allowed origins)
		origin := r.Header.Get("Origin")
		if origin != "" && IsOriginAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}
