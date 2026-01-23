/**
 * Authentication Middleware & Security
 * Provides Geo-Blocking, Rate Limiting, and Session Management
 */

package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ================== SESSION MANAGEMENT ==================

// Session represents an authenticated user session
type Session struct {
	ID           string    `json:"id"`
	DeviceHash   string    `json:"device_hash"`
	CreatedAt    time.Time `json:"created_at"`
	ExpiresAt    time.Time `json:"expires_at"`
	LastUsed     time.Time `json:"last_used"`
	UserAgent    string    `json:"user_agent"`
	IP           string    `json:"ip"`
}

// SessionStore manages persistent session storage
type SessionStore struct {
	sessions map[string]*Session
	file     string
	mu       sync.RWMutex
}

// NewSessionStore creates a session store
func NewSessionStore(dataDir string) *SessionStore {
	store := &SessionStore{
		sessions: make(map[string]*Session),
		file:     dataDir + "/sessions.json",
	}
	store.load()
	
	// Cleanup expired sessions on startup
	go store.cleanupLoop()
	
	return store
}

func (s *SessionStore) load() {
	data, err := ioutil.ReadFile(s.file)
	if err != nil {
		log.Printf("[AUTH] No existing sessions file, starting fresh")
		return
	}
	
	var sessions map[string]*Session
	if err := json.Unmarshal(data, &sessions); err != nil {
		log.Printf("[AUTH] Failed to parse sessions: %v", err)
		return
	}
	
	s.sessions = sessions
	log.Printf("[AUTH] Loaded %d sessions", len(sessions))
}

func (s *SessionStore) save() {
	data, err := json.MarshalIndent(s.sessions, "", "  ")
	if err != nil {
		log.Printf("[AUTH] Failed to marshal sessions: %v", err)
		return
	}
	
	if err := ioutil.WriteFile(s.file, data, 0600); err != nil {
		log.Printf("[AUTH] Failed to save sessions: %v", err)
	}
}

func (s *SessionStore) Create(userAgent, ip string) *Session {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// Generate secure session ID
	bytes := make([]byte, 32)
	rand.Read(bytes)
	sessionID := hex.EncodeToString(bytes)
	
	// Create device hash from User-Agent + IP prefix
	deviceHash := hashString(userAgent + getIPPrefix(ip))
	
	session := &Session{
		ID:         sessionID,
		DeviceHash: deviceHash,
		CreatedAt:  time.Now(),
		ExpiresAt:  time.Now().Add(30 * 24 * time.Hour), // 30 days
		LastUsed:   time.Now(),
		UserAgent:  userAgent,
		IP:         ip,
	}
	
	s.sessions[sessionID] = session
	s.save()
	
	log.Printf("[AUTH] Session created: %s... (expires %s)", sessionID[:8], session.ExpiresAt.Format("2006-01-02"))
	return session
}

func (s *SessionStore) Get(sessionID string) *Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	session, exists := s.sessions[sessionID]
	if !exists {
		return nil
	}
	
	if time.Now().After(session.ExpiresAt) {
		return nil
	}
	
	return session
}

func (s *SessionStore) Touch(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	if session, exists := s.sessions[sessionID]; exists {
		session.LastUsed = time.Now()
		s.save()
	}
}

func (s *SessionStore) Delete(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	delete(s.sessions, sessionID)
	s.save()
}

func (s *SessionStore) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Hour)
	for range ticker.C {
		s.cleanup()
	}
}

func (s *SessionStore) cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	now := time.Now()
	cleaned := 0
	for id, session := range s.sessions {
		if now.After(session.ExpiresAt) {
			delete(s.sessions, id)
			cleaned++
		}
	}
	
	if cleaned > 0 {
		log.Printf("[AUTH] Cleaned up %d expired sessions", cleaned)
		s.save()
	}
}

// ================== RATE LIMITING ==================

// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
	requests map[string][]time.Time
	mu       sync.Mutex
}

// NewRateLimiter creates a rate limiter
func NewRateLimiter() *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
	}
	
	// Cleanup old entries periodically
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			rl.cleanup()
		}
	}()
	
	return rl
}

func (rl *RateLimiter) Allow(ip string, limit int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	now := time.Now()
	cutoff := now.Add(-window)
	
	// Get existing requests and filter old ones
	reqs := rl.requests[ip]
	var valid []time.Time
	for _, t := range reqs {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	
	if len(valid) >= limit {
		return false
	}
	
	valid = append(valid, now)
	rl.requests[ip] = valid
	return true
}

func (rl *RateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	cutoff := time.Now().Add(-5 * time.Minute)
	for ip, reqs := range rl.requests {
		var valid []time.Time
		for _, t := range reqs {
			if t.After(cutoff) {
				valid = append(valid, t)
			}
		}
		if len(valid) == 0 {
			delete(rl.requests, ip)
		} else {
			rl.requests[ip] = valid
		}
	}
}

// ================== GEO-BLOCKING ==================

// DACH country codes
var allowedCountries = map[string]bool{
	"DE": true, // Germany
	"AT": true, // Austria
	"CH": true, // Switzerland
}

// Known bot User-Agent patterns
var botPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)bot`),
	regexp.MustCompile(`(?i)crawler`),
	regexp.MustCompile(`(?i)spider`),
	regexp.MustCompile(`(?i)scraper`),
	regexp.MustCompile(`(?i)curl`),
	regexp.MustCompile(`(?i)wget`),
	regexp.MustCompile(`(?i)python-requests`),
	regexp.MustCompile(`(?i)headless`),
	regexp.MustCompile(`(?i)phantom`),
	regexp.MustCompile(`(?i)selenium`),
}

// isBot checks if User-Agent matches known bot patterns
func isBot(userAgent string) bool {
	// Allow empty user agent (could be legitimate mobile apps)
	if userAgent == "" {
		return false
	}
	
	for _, pattern := range botPatterns {
		if pattern.MatchString(userAgent) {
			return true
		}
	}
	return false
}

// ================== AUTH CONFIGURATION ==================

// AuthConfig holds authentication configuration
type AuthConfig struct {
	PIN            string        // 6-digit PIN
	SessionStore   *SessionStore
	RateLimiter    *RateLimiter
	GeoBlockEnabled bool
}

// Global auth config (set in main)
var authConfig *AuthConfig

// InitAuth initializes the authentication system
func InitAuth(dataDir string, pin string) *AuthConfig {
	// Use environment variable or default PIN
	if pin == "" {
		pin = os.Getenv("AUTH_PIN")
	}
	if pin == "" {
		pin = "274683" // Default: "BRASIL" on phone keypad
	}
	
	authConfig = &AuthConfig{
		PIN:            pin,
		SessionStore:   NewSessionStore(dataDir),
		RateLimiter:    NewRateLimiter(),
		GeoBlockEnabled: os.Getenv("GEO_BLOCK_DISABLED") != "true",
	}
	
	log.Printf("[AUTH] Security system initialized (PIN: %s***)", pin[:2])
	return authConfig
}

// ================== HELPERS ==================

func hashString(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:8])
}

func getIPPrefix(ip string) string {
	// Return first 3 octets for IPv4 or first 4 groups for IPv6
	if strings.Contains(ip, ".") {
		parts := strings.Split(ip, ".")
		if len(parts) >= 3 {
			return strings.Join(parts[:3], ".")
		}
	}
	return ip
}

func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For first (for proxies)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	
	// Check X-Real-IP
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return xri
	}
	
	// Fall back to RemoteAddr
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	return ip
}

func getSessionFromCookie(r *http.Request) *Session {
	cookie, err := r.Cookie("vb_session")
	if err != nil {
		return nil
	}
	return authConfig.SessionStore.Get(cookie.Value)
}

// setSessionCookie sets the session cookie on the response
func setSessionCookie(w http.ResponseWriter, session *Session) {
	http.SetCookie(w, &http.Cookie{
		Name:     "vb_session",
		Value:    session.ID,
		Path:     "/",
		MaxAge:   30 * 24 * 60 * 60, // 30 days
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
}

// clearSessionCookie clears the session cookie
func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "vb_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})
}
