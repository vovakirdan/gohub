package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"

	"gohub/internal/api"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const (
	DEFAULT_SEND_INTERVAL = 5 * time.Second
	PID_FILE              = "/tmp/gohub-agent.pid"
)

var SEND_INTERVAL time.Duration

func init() {
	intervalStr := os.Getenv("SEND_INTERVAL")
	if intervalStr != "" {
		if interval, err := strconv.Atoi(intervalStr); err == nil {
			SEND_INTERVAL = time.Duration(interval) * time.Millisecond
		} else {
			SEND_INTERVAL = DEFAULT_SEND_INTERVAL
		}
	} else {
		SEND_INTERVAL = DEFAULT_SEND_INTERVAL
	}
	log.Printf("Starting agent with interval: %s", SEND_INTERVAL)
}

func main() {
	// Добавляем флаги командной строки
	detach := flag.Bool("d", false, "Run in background (detached mode)")
	detachLong := flag.Bool("detach", false, "Run in background (detached mode)")
	stop := flag.Bool("stop", false, "Stop the running agent")
	flag.Parse()

	// Обработка команды остановки
	if *stop {
		if err := stopAgent(); err != nil {
			log.Fatalf("Failed to stop agent: %v", err)
		}
		fmt.Println("Agent stopped successfully")
		return
	}

	// Если указан флаг -d или --detach, запускаем процесс в фоне
	if *detach || *detachLong {
		if os.Getenv("_DETACHED") != "1" {
			// Получаем путь к текущему исполняемому файлу
			exe, err := os.Executable()
			if err != nil {
				log.Fatalf("Failed to get executable path: %v", err)
			}
			exe, err = filepath.Abs(exe)
			if err != nil {
				log.Fatalf("Failed to get absolute path: %v", err)
			}

			// Создаём новый процесс
			cmd := exec.Command(exe)
			cmd.Env = append(os.Environ(), "_DETACHED=1")
			err = cmd.Start()
			if err != nil {
				log.Fatalf("Failed to start detached process: %v", err)
			}

			// Сохраняем PID
			if err := os.WriteFile(PID_FILE, []byte(strconv.Itoa(cmd.Process.Pid)), 0644); err != nil {
				log.Printf("Warning: Failed to write PID file: %v", err)
			}

			fmt.Println("Agent started in background mode")
			os.Exit(0)
		} else {
			// В дочернем процессе сохраняем свой PID
			if err := os.WriteFile(PID_FILE, []byte(strconv.Itoa(os.Getpid())), 0644); err != nil {
				log.Printf("Warning: Failed to write PID file: %v", err)
			}
		}
	}

	// Считываем AGENT_TAG из окружения (или даём значение по умолчанию)
	tag := os.Getenv("AGENT_TAG")
	if tag == "" {
		tag = "default-tag"
	}

	// Подключаемся к gRPC-серверу
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

	log.Printf("Agent started with tag=%s, sending metrics to gRPC server...", tag)

	for {
		<-ticker.C
		sendSystemMetrics(client, tag)
	}
}

func stopAgent() error {
	// Читаем PID из файла
	data, err := os.ReadFile(PID_FILE)
	if err != nil {
		return fmt.Errorf("failed to read PID file: %v", err)
	}

	pid, err := strconv.Atoi(string(data))
	if err != nil {
		return fmt.Errorf("invalid PID in file: %v", err)
	}

	// Отправляем сигнал процессу
	process, err := os.FindProcess(pid)
	if err != nil {
		return fmt.Errorf("failed to find process: %v", err)
	}

	if err := process.Signal(os.Interrupt); err != nil {
		return fmt.Errorf("failed to stop process: %v", err)
	}

	// Удаляем PID файл
	if err := os.Remove(PID_FILE); err != nil {
		log.Printf("Warning: Failed to remove PID file: %v", err)
	}

	return nil
}

// sendSystemMetrics собирает метрики и отправляет на сервер
func sendSystemMetrics(client api.MetricsServiceClient, tag string) {
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

	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown-host"
	}

	// Для примера извлечём одно суммарное значение
	bytesSent := netCounters[0].BytesSent
	bytesRecv := netCounters[0].BytesRecv

	// Формируем запрос gRPC
	req := &api.MetricsRequest{
		ServerId:     hostname,
		Tag:          tag,
		CpuUsage:     cpuPercent[0],
		MemoryUsage:  memStat.UsedPercent,
		DiskUsage:    diskStat.UsedPercent,
		NetworkUsage: float64(bytesSent + bytesRecv),
	}

	// Отправляем данные на gRPC-сервер
	resp, err := client.SendMetrics(ctx, req)
	if err != nil {
		log.Printf("SendMetrics error: %v", err)
		return
	}

	log.Printf("SendMetrics response: %s, tag=%s, CPU=%.2f%%, MEM=%.2f%%, Disk=%.2f%%, Network=%.2f bytes",
		resp.Status, tag, req.CpuUsage, req.MemoryUsage, req.DiskUsage, req.NetworkUsage,
	)
}
