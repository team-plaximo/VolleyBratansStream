package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io/ioutil"
	"log"
	"net"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Session represents an authenticated user session
type Session struct {
	ID         string    `json:"id"`
	DeviceHash string    `json:"device_hash"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  time.Time `json:"expires_at"`
	LastUsed   time.Time `json:"last_used"`
	UserAgent  string    `json:"user_agent"`
	IP         string    `json:"ip"`
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
	go store.cleanupLoop()
	return store
}

func (s *SessionStore) load() {
	data, err := ioutil.ReadFile(s.file)
	if err != nil {
		return
	}
	var sessions map[string]*Session
	json.Unmarshal(data, &sessions)
	s.sessions = sessions
}

func (s *SessionStore) save() {
	data, _ := json.MarshalIndent(s.sessions, "", "  ")
	ioutil.WriteFile(s.file, data, 0600)
}

func (s *SessionStore) Create(userAgent, ip string) *Session {
	s.mu.Lock()
	defer s.mu.Unlock()
	bytes := make([]byte, 32)
	rand.Read(bytes)
	sessionID := hex.EncodeToString(bytes)
	deviceHash := hashString(userAgent + getIPPrefix(ip))
	session := &Session{
		ID:         sessionID,
		DeviceHash: deviceHash,
		CreatedAt:  time.Now(),
		ExpiresAt:  time.Now().Add(30 * 24 * time.Hour),
		LastUsed:   time.Now(),
		UserAgent:  userAgent,
		IP:         ip,
	}
	s.sessions[sessionID] = session
	s.save()
	return session
}

func (s *SessionStore) Get(sessionID string) *Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, exists := s.sessions[sessionID]
	if !exists || time.Now().After(session.ExpiresAt) {
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
	for range time.NewTicker(1 * time.Hour).C {
		s.cleanup()
	}
}

func (s *SessionStore) cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	cleaned := false
	for id, session := range s.sessions {
		if now.After(session.ExpiresAt) {
			delete(s.sessions, id)
			cleaned = true
		}
	}
	if cleaned {
		s.save()
	}
}

// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
	requests map[string][]time.Time
	mu       sync.Mutex
}

func NewRateLimiter() *RateLimiter {
	rl := &RateLimiter{requests: make(map[string][]time.Time)}
	go func() {
		for range time.NewTicker(5 * time.Minute).C {
			rl.cleanup()
		}
	}()
	return rl
}

func (rl *RateLimiter) Allow(key string, limit int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-window)
	reqs := rl.requests[key]
	var valid []time.Time
	for _, t := range reqs {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	if len(valid) >= limit {
		return false
	}
	rl.requests[key] = append(valid, now)
	return true
}

func (rl *RateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	cutoff := time.Now().Add(-5 * time.Minute)
	for key, reqs := range rl.requests {
		var valid []time.Time
		for _, t := range reqs {
			if t.After(cutoff) {
				valid = append(valid, t)
			}
		}
		if len(valid) == 0 {
			delete(rl.requests, key)
		} else {
			rl.requests[key] = valid
		}
	}
}

var botPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)bot`),
	regexp.MustCompile(`(?i)crawler`),
	regexp.MustCompile(`(?i)spider`),
	regexp.MustCompile(`(?i)scraper`),
	regexp.MustCompile(`(?i)curl`),
	regexp.MustCompile(`(?i)wget`),
}

func IsBot(userAgent string) bool {
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

type AuthService struct {
	PIN          string
	SessionStore *SessionStore
	RateLimiter  *RateLimiter
}

func NewAuthService(dataDir, pin string) *AuthService {
	if pin == "" {
		pin = os.Getenv("AUTH_PIN")
	}
	if pin == "" {
		pin = "274683"
	}
	return &AuthService{
		PIN:          pin,
		SessionStore: NewSessionStore(dataDir),
		RateLimiter:  NewRateLimiter(),
	}
}

func hashString(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:8])
}

func getIPPrefix(ip string) string {
	return ip // simplified for this refactoring
}

// GetClientIP extracts IP from request
func GetClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	return ip
}

// SetSessionCookie sets cookie on response
func SetSessionCookie(w http.ResponseWriter, sessionID string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "vb_session",
		Value:    sessionID,
		Path:     "/",
		MaxAge:   30 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
}

// ClearSessionCookie removes cookie
func ClearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "vb_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})
}

// GetSessionID extracts session ID from request cookie
func GetSessionID(r *http.Request) string {
	cookie, err := r.Cookie("vb_session")
	if err != nil {
		return ""
	}
	return cookie.Value
}
