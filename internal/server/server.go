package server

import (
	"context"
	"fmt"
	"log"
	"net"
	"sync"

	"gohub/internal/api"
	"gohub/internal/db"
	ws "gohub/internal/websocket"

	"google.golang.org/grpc"
)

// MetricsServer реализация gRPC-сервиса
type MetricsServer struct {
	api.UnimplementedMetricsServiceServer
	mu      sync.Mutex
	metrics map[string]*api.MetricsRequest

	storage *db.Storage
	hub     *ws.Hub
}

// NewMetricsServer создаёт сервер с подключённой БД
func NewMetricsServer(storage *db.Storage, hub *ws.Hub) *MetricsServer {
	return &MetricsServer{
		metrics: make(map[string]*api.MetricsRequest),
		storage: storage,
		hub:     hub,
	}
}

// SendMetrics обрабатывает запрос на запись метрик
func (s *MetricsServer) SendMetrics(ctx context.Context, req *api.MetricsRequest) (*api.MetricsResponse, error) {
	s.mu.Lock()
	s.metrics[req.ServerId+":"+req.Tag] = req
	s.mu.Unlock()

	// Логируем
	log.Printf("Received metrics: host=%s, tag=%s, CPU=%.2f, MEM=%.2f, DISK=%.2f, NET=%.2f",
		req.ServerId, req.Tag, req.CpuUsage, req.MemoryUsage, req.DiskUsage, req.NetworkUsage,
	)

	// Сохраняем в БД
	if err := s.storage.SaveMetrics(
		ctx,
		req.ServerId,
		req.Tag,
		req.CpuUsage,
		req.MemoryUsage,
		req.DiskUsage,
		req.NetworkUsage,
	); err != nil {
		log.Printf("DB insert error: %v", err)
		return &api.MetricsResponse{Status: "DB Error"}, err
	}

	// Рассылаем по WebSocket
	s.hub.BroadcastMetrics(ws.WSMetricUpdate{
		Message:       "New metrics received",
		ServerID:      req.ServerId,
		Tag:           req.Tag,
		CPUUsage:      req.CpuUsage,
		MemoryUsage:   req.MemoryUsage,
		DiskUsage:     req.DiskUsage,
		NetworkUsage:  req.NetworkUsage,
	})

	return &api.MetricsResponse{Status: "OK"}, nil
}

// ListMetrics возвращает список метрик (упрощённо)
func (s *MetricsServer) ListMetrics(ctx context.Context, req *api.ListMetricsRequest) (*api.ListMetricsResponse, error) {
	limit := int64(50) // дефолт
	if req.Limit > 0 {
		limit = req.Limit
	}
	data, err := s.storage.LoadMetrics(ctx, req.ServerId, req.Tag, limit)
	if err != nil {
		log.Printf("DB select error: %v", err)
		return nil, err
	}

	metrics := make([]*api.Metric, 0, len(data))
	for _, row := range data {
		metrics = append(metrics, &api.Metric{
			Id:           row.ID,
			ServerId:     row.ServerID,
			Tag:          row.Tag,
			CpuUsage:     row.CPUUsage,
			MemoryUsage:  row.MemoryUsage,
			DiskUsage:    row.DiskUsage,
			NetworkUsage: row.NetworkUsage,
			CreatedAt:    row.CreatedAt,
		})
	}

	return &api.ListMetricsResponse{
		Metrics: metrics,
	}, nil
}

// StreamMetrics - пока заглушка
func (s *MetricsServer) StreamMetrics(req *api.StreamRequest, stream api.MetricsService_StreamMetricsServer) error {
	return fmt.Errorf("not implemented")
}

// Start запускает gRPC-сервер
func (s *MetricsServer) Start() error {
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		return fmt.Errorf("failed to listen on :50051: %w", err)
	}

	grpcServer := grpc.NewServer()
	api.RegisterMetricsServiceServer(grpcServer, s)

	log.Println("gRPC server is running on :50051")
	return grpcServer.Serve(listener)
}
