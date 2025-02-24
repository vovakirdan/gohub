package main

import (
	"context"
	"log"
	"time"

	"gohub/internal/api"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Подключаемся к gRPC-серверу
	conn, err := grpc.Dial("localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	client := api.NewMetricsServiceClient(conn)

	// Отправляем метрики каждые 5 секунд
	for {
		req := &api.MetricsRequest{
			ServerId:    "server-01",
			CpuUsage:    42.5,
			MemoryUsage: 72.2,
			DiskUsage:   33.1,
			NetworkUsage: 4.5,
		}
		resp, err := client.SendMetrics(context.Background(), req)
		if err != nil {
			log.Printf("SendMetrics failed: %v", err)
		} else {
			log.Printf("SendMetrics response: %s", resp.Status)
		}
		time.Sleep(5 * time.Second)
	}
}
