package main

import (
	"log"
	"net/http"
	"os"

	"gohub/internal/db"
	"gohub/internal/server"
	ws "gohub/internal/websocket"
)

func main() {
	// Подключаемся к БД
	dsn := "postgres://gohub:gohub@localhost:5432/gohub?sslmode=disable"
	if val, ok := os.LookupEnv("DATABASE_URL"); ok {
		dsn = val
	}
	storage, err := db.NewStorage(dsn)
	if err != nil {
		log.Fatalf("Failed to connect db: %v", err)
	}

	// Инициализируем WebSocket-хаб
	hub := ws.NewHub()

	// Инициализируем gRPC-сервер
	
	go func() {
		http.HandleFunc("/ws", hub.HandleConnections)
		http.Handle("/", http.FileServer(http.Dir("./web"))) // статика в ./web
		log.Println("HTTP/WebSocket server on :8080")
		if err := http.ListenAndServe(":8080", nil); err != nil {
			log.Fatalf("ListenAndServe error: %v", err)
		}
	}()
		
	srv := server.NewMetricsServer(storage, hub)

	// Запускаем gRPC
	if err := srv.Start(); err != nil {
		log.Fatalf("Failed to start gRPC server: %v", err)
	}
}
