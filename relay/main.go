/**
 * Moblin Remote Control - WebSocket Relay Server
 * Bridges Moblin App and Browser Interface via WebSocket
 */

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ISO 8601 custom log writer
type timestampWriter struct{}

func (w timestampWriter) Write(p []byte) (n int, err error) {
	return fmt.Printf("%s %s", time.Now().Format(time.RFC3339), string(p))
}

func init() {
	log.SetFlags(0) // Disable default flags
	log.SetOutput(timestampWriter{})
}

// getAllowedOrigins returns allowed CORS origins from environment
func getAllowedOrigins() []string {
	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins == "" {
		// Development defaults
		return []string{"http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3000"}
	}
	return strings.Split(origins, ",")
}

// isOriginAllowed checks if the request origin is in allowed list
func isOriginAllowed(origin string) bool {
	allowed := getAllowedOrigins()
	for _, o := range allowed {
		if strings.TrimSpace(o) == origin {
			return true
		}
	}
	return false
}

// ClientType distinguishes between Moblin App and Browser connections
type ClientType string

const (
	ClientTypeMoblin  ClientType = "moblin"
	ClientTypeBrowser ClientType = "browser"
)

// Client represents a connected WebSocket client
type Client struct {
	ID         string
	Type       ClientType
	Conn       *websocket.Conn
	Send       chan []byte
	Relay      *Relay
	Authorized bool
	mu         sync.Mutex
}

// Message represents a JSON message structure
type Message struct {
	Type     string          `json:"type"`
	Password string          `json:"password,omitempty"`
	Data     json.RawMessage `json:"data,omitempty"`
	// Additional fields for specific commands
	Name    string  `json:"name,omitempty"`
	Level   float64 `json:"level,omitempty"`
	Kbps    int     `json:"kbps,omitempty"`
	Scene   string  `json:"scene,omitempty"`
	Bitrate int     `json:"bitrate,omitempty"`
	FPS     int     `json:"fps,omitempty"`
	Battery int     `json:"battery,omitempty"`
	Viewers int     `json:"viewers,omitempty"`
	Message string  `json:"message,omitempty"`
	Status  string  `json:"status,omitempty"`
	// Advanced IRL streaming fields
	ThermalState string       `json:"thermal_state,omitempty"`
	UploadStats  *UploadStats `json:"upload_stats,omitempty"`
	Recording    bool         `json:"recording,omitempty"`
	Muted        bool         `json:"muted,omitempty"`
	Enabled      bool         `json:"enabled,omitempty"`
}

// UploadStats contains per-interface network statistics
type UploadStats struct {
	LTE  *InterfaceStats `json:"lte,omitempty"`
	WiFi *InterfaceStats `json:"wifi,omitempty"`
}

// InterfaceStats contains stats for a single network interface
type InterfaceStats struct {
	Kbps       int `json:"kbps"`
	RTT        int `json:"rtt"`
	PacketLoss int `json:"packet_loss,omitempty"`
}

// Relay manages all WebSocket connections and message routing
type Relay struct {
	clients    map[string]*Client
	moblin     *Client // Currently connected Moblin app
	browsers   map[string]*Client
	password   string
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	mu         sync.RWMutex
}

// NewRelay creates a new relay instance
func NewRelay(password string) *Relay {
	return &Relay{
		clients:    make(map[string]*Client),
		browsers:   make(map[string]*Client),
		password:   password,
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte, 256),
	}
}

// Run starts the relay's main event loop
func (r *Relay) Run() {
	for {
		select {
		case client := <-r.register:
			r.mu.Lock()
			r.clients[client.ID] = client
			if client.Type == ClientTypeMoblin {
				r.moblin = client
				log.Printf("[RELAY] Moblin app connected: %s", client.ID)
				// Notify all browsers about moblin connection
				r.notifyBrowsers(Message{Type: "moblin_connected"})
			} else {
				r.browsers[client.ID] = client
				log.Printf("[RELAY] Browser connected: %s (total: %d)", client.ID, len(r.browsers))
			}
			r.mu.Unlock()

		case client := <-r.unregister:
			r.mu.Lock()
			if _, ok := r.clients[client.ID]; ok {
				delete(r.clients, client.ID)
				close(client.Send)

				if client.Type == ClientTypeMoblin {
					r.moblin = nil
					log.Printf("[RELAY] Moblin app disconnected")
					// Notify all browsers about moblin disconnection
					r.notifyBrowsers(Message{Type: "moblin_disconnected"})
				} else {
					delete(r.browsers, client.ID)
					log.Printf("[RELAY] Browser disconnected: %s (remaining: %d)", client.ID, len(r.browsers))
				}
			}
			r.mu.Unlock()

		case message := <-r.broadcast:
			r.mu.RLock()
			for _, client := range r.clients {
				select {
				case client.Send <- message:
				default:
					// Buffer full, skip
				}
			}
			r.mu.RUnlock()
		}
	}
}

// notifyBrowsers sends a message to all connected browsers
func (r *Relay) notifyBrowsers(msg Message) {
	data, _ := json.Marshal(msg)
	for _, browser := range r.browsers {
		select {
		case browser.Send <- data:
		default:
		}
	}
}

// routeToMoblin sends a message from browser to Moblin app
func (r *Relay) routeToMoblin(msg []byte) {
	r.mu.RLock()
	moblin := r.moblin
	r.mu.RUnlock()

	if moblin == nil {
		log.Println("[RELAY] Cannot route to Moblin: not connected")
		return
	}

	select {
	case moblin.Send <- msg:
		log.Printf("[RELAY] Routed message to Moblin")
	default:
		log.Println("[RELAY] Moblin send buffer full")
	}
}

// routeToBrowsers sends a message from Moblin to all browsers
func (r *Relay) routeToBrowsers(msg []byte) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, browser := range r.browsers {
		if browser.Authorized {
			select {
			case browser.Send <- msg:
			default:
			}
		}
	}
	log.Printf("[RELAY] Routed message to %d browsers", len(r.browsers))
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true // Allow requests with no origin (e.g., CLI tools, Postman)
		}
		return isOriginAllowed(origin)
	},
}

// ServeWS handles WebSocket upgrade requests
func (r *Relay) ServeWS(w http.ResponseWriter, req *http.Request) {
	conn, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Printf("[ERROR] WebSocket upgrade failed: %v", err)
		return
	}

	// Determine client type from query parameter
	clientType := ClientTypeBrowser
	if req.URL.Query().Get("type") == "moblin" {
		clientType = ClientTypeMoblin
	}

	client := &Client{
		ID:         fmt.Sprintf("%s-%d", clientType, time.Now().UnixNano()),
		Type:       clientType,
		Conn:       conn,
		Send:       make(chan []byte, 256),
		Relay:      r,
		Authorized: r.password == "", // Auto-authorize if no password set
	}

	r.register <- client

	go client.writePump()
	go client.readPump()
}

// readPump handles incoming messages from the client
func (c *Client) readPump() {
	defer func() {
		c.Relay.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(65536)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[ERROR] Read error: %v", err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("[ERROR] Invalid JSON: %v", err)
			continue
		}

		c.handleMessage(msg, message)
	}
}

// handleMessage processes incoming messages based on type
func (c *Client) handleMessage(msg Message, raw []byte) {
	// Handle authentication
	if msg.Type == "auth" {
		if c.Relay.password == "" || msg.Password == c.Relay.password {
			c.mu.Lock()
			c.Authorized = true
			c.mu.Unlock()
			c.sendJSON(Message{Type: "auth_success", Status: "ok"})
			log.Printf("[AUTH] Client %s authorized", c.ID)
		} else {
			c.sendJSON(Message{Type: "auth_failed", Status: "error", Message: "Invalid password"})
			log.Printf("[AUTH] Client %s failed authentication", c.ID)
		}
		return
	}

	// Check authorization for other messages
	if !c.Authorized && c.Relay.password != "" {
		c.sendJSON(Message{Type: "error", Message: "Not authorized"})
		return
	}

	log.Printf("[MSG] %s -> %s: %s", c.Type, msg.Type, string(raw))

	// Route messages based on client type
	if c.Type == ClientTypeMoblin {
		// Messages from Moblin go to all browsers
		c.Relay.routeToBrowsers(raw)
	} else {
		// Messages from browsers go to Moblin
		c.Relay.routeToMoblin(raw)
	}
}

// sendJSON sends a JSON message to the client
func (c *Client) sendJSON(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[ERROR] JSON marshal failed: %v", err)
		return
	}

	select {
	case c.Send <- data:
	default:
		log.Printf("[WARN] Send buffer full for client %s", c.ID)
	}
}

// writePump handles outgoing messages to the client
func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Health endpoint for monitoring
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func main() {
	port := flag.Int("port", 8080, "Server port")
	password := flag.String("password", "", "Optional password for WebSocket authentication")
	dataDir := flag.String("data", "./data", "Data directory for state persistence")
	authPIN := flag.String("pin", "", "6-digit PIN for web authentication (env: AUTH_PIN)")
	flag.Parse()

	// Initialize Scout Store
	scoutStore, err := NewScoutStore(*dataDir)
	if err != nil {
		log.Fatalf("Failed to initialize scout store: %v", err)
	}
	log.Printf("[SCOUT] State store initialized at %s", *dataDir)

	// Initialize Matchday Store
	matchdayStore, err := NewMatchdayStore(*dataDir)
	if err != nil {
		log.Fatalf("Failed to initialize matchday store: %v", err)
	}
	log.Printf("[MATCHDAY] Store initialized at %s", *dataDir)

	// Initialize Authentication System
	InitAuth(*dataDir, *authPIN)

	relay := NewRelay(*password)
	go relay.Run()

	// Static file server for web interface
	// Try ./web first (Docker), then ../web (Local Dev)
	webDir := "./web"
	if _, err := os.Stat(webDir); os.IsNotExist(err) {
		webDir = "../web"
	}
	log.Printf("[SERVER] Serving static files from: %s", webDir)
	
	// Custom file server with auth for protected pages
	fileServer := http.FileServer(http.Dir(webDir))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		
		// Public paths (no auth required)
		publicPaths := []string{
			"/login.html",
			"/health",
			"/favicon.ico",
			"/styles.css",
			"/overlay/", // Overlays are public for OBS
		}
		
		isPublic := false
		for _, pp := range publicPaths {
			if strings.HasPrefix(path, pp) || path == pp {
				isPublic = true
				break
			}
		}
		
		// Root path needs auth check
		if path == "/" || path == "/index.html" || !isPublic {
			session := getSessionFromCookie(r)
			if session == nil {
				http.Redirect(w, r, "/login.html", http.StatusFound)
				return
			}
			authConfig.SessionStore.Touch(session.ID)
		}
		
		fileServer.ServeHTTP(w, r)
	})

	// WebSocket endpoint (uses its own password auth)
	http.HandleFunc("/ws", relay.ServeWS)

	// Health check endpoint (public)
	http.HandleFunc("/health", healthHandler)

	// ========== AUTH ENDPOINTS ==========
	http.HandleFunc("/api/auth/login", corsMiddleware(handleLogin))
	http.HandleFunc("/api/auth/logout", corsMiddleware(handleLogout))
	http.HandleFunc("/api/auth/session", corsMiddleware(handleSession))

	// ========== PROTECTED API ENDPOINTS ==========
	http.HandleFunc("/api/scout", corsMiddleware(authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		handleScoutAPI(w, r, scoutStore, relay)
	})))
	http.HandleFunc("/api/scout/version", corsMiddleware(authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		handleScoutVersion(w, r, scoutStore)
	})))
	http.HandleFunc("/api/scout/archive", corsMiddleware(authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		handleScoutArchive(w, r, scoutStore)
	})))

	// Matchday
	http.HandleFunc("/api/matchday", corsMiddleware(authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		handleMatchdayAPI(w, r, matchdayStore, relay)
	})))
	http.HandleFunc("/api/matchday/parse", corsMiddleware(authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		handleMatchdayParse(w, r, matchdayStore)
	})))

	addr := fmt.Sprintf(":%d", *port)
	log.Printf("╔════════════════════════════════════════════════╗")
	log.Printf("║  VolleyBratans Stream Platform                 ║")
	log.Printf("╠════════════════════════════════════════════════╣")
	log.Printf("║  WebSocket:  ws://localhost%s/ws             ║", addr)
	log.Printf("║  Web UI:     http://localhost%s              ║", addr)
	log.Printf("║  Health:     http://localhost%s/health       ║", addr)
	log.Printf("║  Scout API:  http://localhost%s/api/scout    ║", addr)
	log.Printf("╠════════════════════════════════════════════════╣")
	log.Printf("║  ⚡ SECURITY ENABLED                            ║")
	log.Printf("║  Login:      http://localhost%s/login.html   ║", addr)
	log.Printf("║  Rate Limit: 100 req/min per IP                ║")
	log.Printf("║  Sessions:   30-day persistent                 ║")
	log.Printf("╚════════════════════════════════════════════════╝")

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

// corsMiddleware adds CORS and security headers for API endpoints
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Security headers (always set)
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// CORS headers (only for allowed origins)
		origin := r.Header.Get("Origin")
		if origin != "" && isOriginAllowed(origin) {
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

// handleMatchdayAPI handles GET/POST for matchday configuration
func handleMatchdayAPI(w http.ResponseWriter, r *http.Request, store *MatchdayStore, relay *Relay) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "GET":
		state := store.GetState()
		json.NewEncoder(w).Encode(state)

	case "POST":
		var newState MatchdayState
		if err := json.NewDecoder(r.Body).Decode(&newState); err != nil {
			http.Error(w, `{"error": "Invalid JSON"}`, http.StatusBadRequest)
			return
		}

		if err := store.UpdateState(newState); err != nil {
			http.Error(w, `{"error": "Failed to save state"}`, http.StatusInternalServerError)
			return
		}

		updatedState := store.GetState()
		log.Printf("[MATCHDAY] State updated (version %d)", updatedState.Version)

		// Broadcast update to all connected browsers
		broadcastMsg := map[string]interface{}{
			"type":    "matchday_update",
			"version": updatedState.Version,
			"data":    updatedState,
		}
		broadcastData, _ := json.Marshal(broadcastMsg)
		relay.broadcast <- broadcastData

		json.NewEncoder(w).Encode(updatedState)

	default:
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// handleMatchdayParse fetches and parses a DVV link
func handleMatchdayParse(w http.ResponseWriter, r *http.Request, store *MatchdayStore) {
	w.Header().Set("Content-Type", "application/json")
	
	url := r.URL.Query().Get("url")
	if url == "" {
		http.Error(w, `{"error": "Missing url parameter"}`, http.StatusBadRequest)
		return
	}
	
	result, err := store.ParseDVV(url)
	if err != nil {
		log.Printf("[MATCHDAY] Parse error: %v", err)
		http.Error(w, fmt.Sprintf(`{"error": "%v"}`, err), http.StatusBadRequest)
		return
	}
	
	json.NewEncoder(w).Encode(result)
}

// handleScoutAPI handles GET/POST for scout state
func handleScoutAPI(w http.ResponseWriter, r *http.Request, store *ScoutStore, relay *Relay) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "GET":
		state := store.GetState()
		json.NewEncoder(w).Encode(state)
		log.Printf("[SCOUT] State fetched (version %d)", state.Version)

	case "POST":
		var newState ScoutState
		if err := json.NewDecoder(r.Body).Decode(&newState); err != nil {
			http.Error(w, `{"error": "Invalid JSON"}`, http.StatusBadRequest)
			return
		}

		if err := store.UpdateState(newState); err != nil {
			http.Error(w, `{"error": "Failed to save state"}`, http.StatusInternalServerError)
			return
		}

		updatedState := store.GetState()
		log.Printf("[SCOUT] State updated (version %d)", updatedState.Version)

		// Broadcast update to all connected browsers via WebSocket
		broadcastMsg := map[string]interface{}{
			"type":    "scout_update",
			"version": updatedState.Version,
		}
		broadcastData, _ := json.Marshal(broadcastMsg)
		relay.broadcast <- broadcastData

		json.NewEncoder(w).Encode(updatedState)

	default:
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// handleScoutVersion returns just the version number for sync checks
func handleScoutVersion(w http.ResponseWriter, r *http.Request, store *ScoutStore) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"version":   store.GetVersion(),
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// handleScoutArchive archives the current match and resets state
func handleScoutArchive(w http.ResponseWriter, r *http.Request, store *ScoutStore) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	if err := store.ArchiveMatch(); err != nil {
		http.Error(w, `{"error": "Failed to archive match"}`, http.StatusInternalServerError)
		return
	}

	log.Printf("[SCOUT] Match archived successfully")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"message": "Match archived successfully",
	})
}


