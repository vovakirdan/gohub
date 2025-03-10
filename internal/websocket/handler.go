package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// Сообщение, которое шлём клиенту
type WSMetricUpdate struct {
	Message    string  `json:"message"`
	ServerID   string  `json:"server_id"`
	Tag        string  `json:"tag"`
	CPUUsage   float64 `json:"cpu_usage"`
	MemoryUsage float64 `json:"memory_usage"`
	DiskUsage   float64 `json:"disk_usage"`
	NetworkUsage float64 `json:"network_usage"`
	Timestamp    int64   `json:"timestamp"`
}

type Hub struct {
	mu       sync.Mutex
	clients  map[*websocket.Conn]bool
	upgrader websocket.Upgrader
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[*websocket.Conn]bool),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *Hub) HandleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade WS: %v", err)
		return
	}
	h.mu.Lock()
	h.clients[ws] = true
	h.mu.Unlock()

	log.Println("New WebSocket client connected")

	// Простейший цикл чтения, чтобы когда клиент закроется — удалить
	for {
		_, _, err := ws.ReadMessage()
		if err != nil {
			log.Printf("WS client disconnected: %v", err)
			h.mu.Lock()
			delete(h.clients, ws)
			h.mu.Unlock()
			ws.Close()
			break
		}
	}
}

func (h *Hub) BroadcastMetrics(update WSMetricUpdate) {
	h.mu.Lock()
	defer h.mu.Unlock()

	data, _ := json.Marshal(update)
	for ws := range h.clients {
		if err := ws.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("WS write error: %v", err)
			ws.Close()
			delete(h.clients, ws)
		}
	}
}
