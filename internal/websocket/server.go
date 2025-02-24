package websocket

import (
    "github.com/gorilla/websocket"
    "net/http"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}

func HandleConnections(w http.ResponseWriter, r *http.Request) {
    conn, _ := upgrader.Upgrade(w, r, nil)
    for {
        message := "Server metrics updated!"
        conn.WriteMessage(websocket.TextMessage, []byte(message))
    }
}
