package main

import (
	"log"
	"gohub/internal/server"
)

func main() {
	srv := server.NewMetricsServer()
	if err := srv.Start(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
