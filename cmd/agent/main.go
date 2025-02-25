package main

import (
	"context"
	"log"
	"time"

	"gohub/internal/api"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const SEND_INTERVAL = 5 * time.Second

func main() {
	conn, err := grpc.NewClient(
		"localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("Failed to connect to gRPC server: %v", err)
	}
	defer conn.Close()

	client := api.NewMetricsServiceClient(conn)

	ticker := time.NewTicker(SEND_INTERVAL)
	defer ticker.Stop()

	log.Println("Agent started, sending metrics to gRPC server...")

	for {
		<-ticker.C
		sendSystemMetrics(client)
	}
}

// sendSystemMetrics собирает метрики и отправляет на сервер
func sendSystemMetrics(client api.MetricsServiceClient) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// 1) CPU usage (средний процент использования с момента последнего вызова)
	cpuPercent, err := cpu.Percent(0, false)
	if err != nil || len(cpuPercent) == 0 {
		log.Printf("Could not read CPU usage: %v", err)
		return
	}

	// 2) Memory usage
	memStat, err := mem.VirtualMemory()
	if err != nil {
		log.Printf("Could not read memory usage: %v", err)
		return
	}

	// 3) Disk usage (корневой раздел "/")
	diskStat, err := disk.Usage("/")
	if err != nil {
		log.Printf("Could not read disk usage: %v", err)
		return
	}

	// 4) Network usage (количество байт по интерфейсам с момента запуска)
	//    Тут, как правило, нужно хранить предыдущие значения и высчитывать дельту.
	//    Для примера возьмём bytes sent/received на всех интерфейсах.
	netCounters, err := net.IOCounters(false)
	if err != nil || len(netCounters) == 0 {
		log.Printf("Could not read network usage: %v", err)
		return
	}

	// Для примера извлечём одно суммарное значение
	bytesSent := netCounters[0].BytesSent
	bytesRecv := netCounters[0].BytesRecv

	// Формируем запрос gRPC
	req := &api.MetricsRequest{
		ServerId:     "my-real-host",                 // Можно получить системное имя хоста через os.Hostname()
		CpuUsage:     cpuPercent[0],                  // Процент использования CPU
		MemoryUsage:  memStat.UsedPercent,            // Процент использования ОЗУ
		DiskUsage:    diskStat.UsedPercent,           // Процент заполнения диска
		NetworkUsage: float64(bytesSent + bytesRecv), // Условная метрика сети
	}

	// Отправляем данные на gRPC-сервер
	resp, err := client.SendMetrics(ctx, req)
	if err != nil {
		log.Printf("SendMetrics error: %v", err)
		return
	}

	// Логируем ответ сервера
	log.Printf("SendMetrics response: %s, CPU=%.2f%%, MEM=%.2f%%, Disk=%.2f%%, Net=%.0f bytes",
		resp.Status, req.CpuUsage, req.MemoryUsage, req.DiskUsage, req.NetworkUsage,
	)
}
