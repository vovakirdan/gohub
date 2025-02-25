package server

import (
	"context"
	"fmt"
	"log"
	"net"
	"sync"

	"gohub/internal/api"
	"google.golang.org/grpc"
)

type MetricsServer struct {
	api.UnimplementedMetricsServiceServer
	mu      sync.Mutex
	metrics map[string]*api.MetricsRequest
}

func NewMetricsServer() *MetricsServer {
	return &MetricsServer{
		metrics: make(map[string]*api.MetricsRequest),
	}
}

func (s *MetricsServer) SendMetrics(ctx context.Context, req *api.MetricsRequest) (*api.MetricsResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.metrics[req.ServerId] = req
	log.Printf(
		"Received metrics from %s: CPU: %.2f%%, RAM: %.2f%%, Disk: %.2f%%, Net: %.0f bytes",
		req.ServerId,
		req.CpuUsage,
		req.MemoryUsage,
		req.DiskUsage,
		req.NetworkUsage,
	)

	return &api.MetricsResponse{Status: "OK"}, nil
}

func (s *MetricsServer) Start() error {
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		return fmt.Errorf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	api.RegisterMetricsServiceServer(grpcServer, s)

	log.Println("gRPC server is running on :50051")
	return grpcServer.Serve(listener)
}
