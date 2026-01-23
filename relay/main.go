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
	"github.com/volleybratans/moblin-relay/handlers"
	"github.com/volleybratans/moblin-relay/middleware"
	"github.com/volleybratans/moblin-relay/services"
	"github.com/volleybratans/moblin-relay/stores"
)

// ISO 8601 custom log writer
type timestampWriter struct{}

func (w timestampWriter) Write(p []byte) (n int, err error) {
	return fmt.Printf("%s %s", time.Now().Format(time.RFC3339), string(p))
}

func init() {
	log.SetFlags(0)
	log.SetOutput(timestampWriter{})
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
	Name     string          `json:"name,omitempty"`
	Level    float64         `json:"level,omitempty"`
	Kbps     int             `json:"kbps,omitempty"`
	Scene    string          `json:"scene,omitempty"`
	Bitrate  int             `json:"bitrate,omitempty"`
	FPS      int             `json:"fps,omitempty"`
	Battery  int             `json:"battery,omitempty"`
	Viewers  int             `json:"viewers,omitempty"`
	Message  string          `json:"message,omitempty"`
	Status   string          `json:"status,omitempty"`
}

// Relay manages all WebSocket connections and message routing
type Relay struct {
	clients    map[string]*Client
	moblin     *Client
	browsers   map[string]*Client
	password   string
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	mu         sync.RWMutex
}

// Satisfies handlers.Broadcaster interface
func (r *Relay) Broadcast(msg []byte) {
	r.broadcast <- msg
}

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

func (r *Relay) Run() {
	for {
		select {
		case client := <-r.register:
			r.mu.Lock()
			r.clients[client.ID] = client
			if client.Type == ClientTypeMoblin {
				r.moblin = client
				log.Printf("[RELAY] Moblin app connected: %s", client.ID)
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
				}
			}
			r.mu.RUnlock()
		}
	}
}

func (r *Relay) notifyBrowsers(msg Message) {
	data, _ := json.Marshal(msg)
	for _, browser := range r.browsers {
		select {
		case browser.Send <- data:
		default:
		}
	}
}

func (r *Relay) routeToMoblin(msg []byte) {
	r.mu.RLock()
	moblin := r.moblin
	r.mu.RUnlock()
	if moblin == nil {
		return
	}
	select {
	case moblin.Send <- msg:
	default:
	}
}

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
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		return middleware.IsOriginAllowed(origin)
	},
}

func (r *Relay) ServeWS(w http.ResponseWriter, req *http.Request) {
	conn, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		return
	}
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
		Authorized: r.password == "",
	}
	r.register <- client
	go client.writePump()
	go client.readPump()
}

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
			break
		}
		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}
		c.handleMessage(msg, message)
	}
}

func (c *Client) handleMessage(msg Message, raw []byte) {
	if msg.Type == "auth" {
		if c.Relay.password == "" || msg.Password == c.Relay.password {
			c.mu.Lock()
			c.Authorized = true
			c.mu.Unlock()
			c.sendJSON(Message{Type: "auth_success", Status: "ok"})
		} else {
			c.sendJSON(Message{Type: "auth_failed", Status: "error", Message: "Invalid password"})
		}
		return
	}
	if !c.Authorized && c.Relay.password != "" {
		return
	}
	if c.Type == ClientTypeMoblin {
		c.Relay.routeToBrowsers(raw)
	} else {
		c.Relay.routeToMoblin(raw)
	}
}

func (c *Client) sendJSON(msg Message) {
	data, _ := json.Marshal(msg)
	select {
	case c.Send <- data:
	default:
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			w.Close()
		case <-ticker.C:
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func main() {
	port := flag.Int("port", 8080, "Server port")
	password := flag.String("password", "", "WebSocket password")
	dataDir := flag.String("data", "./data", "Data directory")
	authPIN := flag.String("pin", "", "6-digit PIN")
	flag.Parse()

	// Initialize Stores
	scoutStore, _ := stores.NewScoutStore(*dataDir)
	matchdayStore, _ := stores.NewMatchdayStore(*dataDir)

	// Initialize Services
	authService := services.NewAuthService(*dataDir, *authPIN)

	// Relay for WebSockets and Broadcaster for handlers
	relay := NewRelay(*password)
	go relay.Run()

	// Initialize Handlers
	authHandler := handlers.NewAuthHandler(authService)
	scoutHandler := handlers.NewScoutHandler(scoutStore, relay)
	matchdayHandler := handlers.NewMatchdayHandler(matchdayStore, relay)

	// Initialize Middleware
	authMid := middleware.NewAuthMiddleware(authService)

	// Routes
	http.HandleFunc("/ws", relay.ServeWS)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Auth API
	http.HandleFunc("/api/auth/login", middleware.CorsMiddleware(authHandler.HandleLogin))
	http.HandleFunc("/api/auth/logout", middleware.CorsMiddleware(authHandler.HandleLogout))
	http.HandleFunc("/api/auth/session", middleware.CorsMiddleware(authHandler.HandleSession))

	// Protected Scout API
	http.HandleFunc("/api/scout", middleware.CorsMiddleware(authMid.Protect(scoutHandler.HandleAPI)))
	http.HandleFunc("/api/scout/version", middleware.CorsMiddleware(authMid.Protect(scoutHandler.HandleVersion)))
	http.HandleFunc("/api/scout/archive", middleware.CorsMiddleware(authMid.Protect(scoutHandler.HandleArchive)))

	// Protected Matchday API
	http.HandleFunc("/api/matchday", middleware.CorsMiddleware(authMid.Protect(matchdayHandler.HandleAPI)))
	http.HandleFunc("/api/matchday/parse", middleware.CorsMiddleware(authMid.Protect(matchdayHandler.HandleParse)))

	// Static files with auth
	webDir := "./web"
	if _, err := os.Stat(webDir); os.IsNotExist(err) {
		webDir = "../web"
	}
	fileServer := http.FileServer(http.Dir(webDir))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/" || path == "/index.html" || (!strings.HasPrefix(path, "/login.html") && !strings.HasPrefix(path, "/overlay/")) {
			sessionID := services.GetSessionID(r)
			if authService.SessionStore.Get(sessionID) == nil {
				http.Redirect(w, r, "/login.html", http.StatusFound)
				return
			}
			authService.SessionStore.Touch(sessionID)
		}
		fileServer.ServeHTTP(w, r)
	})

	log.Printf("[SERVER] Starting on :%d", *port)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", *port), nil); err != nil {
		log.Fatal(err)
	}
}
