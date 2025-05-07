package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"gohub/internal/api"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	PID_FILE              = "/tmp/my_agent.pid"
	TAG_FILE              = "/tmp/my_agent.tag"
	DEFAULT_SEND_INTERVAL = 5 * time.Second
	SEND_INTERVAL         time.Duration
)

func main() {
	flags := parseFlags(os.Args[1:]) // Получим значения и порядок

	// Отдельно обрабатываем help
	if isHelpRequested() {
		flag.Usage()
		return
	}

	// Обрабатываем SEND_INTERVAL
	SEND_INTERVAL = getSendInterval(flags)

	// Обработка команды остановки
	if flags["stop"].(bool) {
		if err := stopAgent(); err != nil {
			log.Fatalf("Failed to stop agent: %v", err)
		}
		fmt.Println("Agent stopped successfully")
		return
	}

	// Detached mode
	if flags["detach"].(bool) {
		if os.Getenv("_DETACHED") != "1" {
			runDetached()
			return
		}
		writePID()
	}

	tag := getEnvOrDefault("AGENT_TAG", flags["tag"].(string))

	if tag == "" || tag == "default_tag" {
		// Сбросить старый сохранённый тег, если передан флаг
		if flags["resetTag"].(bool) {
			_ = os.Remove(TAG_FILE)
			log.Println("Saved tag file removed; a new tag will be generated.")
		}

		// Попробовать загрузить старый тег
		var err error
		tag, err = loadTagFromFile()
		if err != nil {
			tag = generateRandomTag()
			if err := saveTagToFile(tag); err != nil {
				log.Printf("Warning: Failed to save tag to file: %v", err)
			}
		}
	}

	// Подключаемся к gRPC-серверу
	conn, err := grpc.NewClient("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect to gRPC server: %v", err)
	}
	defer conn.Close()

	client := api.NewMetricsServiceClient(conn)
	ticker := time.NewTicker(SEND_INTERVAL)
	defer ticker.Stop()

	log.Printf("Agent started with tag=%s, interval=%s", tag, SEND_INTERVAL)

	// Graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	go listenForSignals(cancel)

	for {
		select {
		case <-ctx.Done():
			log.Println("Agent shutting down...")
			return
		case <-ticker.C:
			sendSystemMetrics(client, tag)
		}
	}
}

func generateRandomTag() string {
	adjectives := []string{
		"shiny", "silent", "brave", "loyal", "fuzzy",
		"hidden", "ancient", "swift", "sleepy", "upgraded",
	}
	nouns := []string{
		"octopus", "goggles", "tiger", "lantern", "avocado",
		"penguin", "rocket", "panther", "squid", "falcon",
	}
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	adj := adjectives[r.Intn(len(adjectives))]
	noun := nouns[r.Intn(len(nouns))]
	return fmt.Sprintf("%s-%s", adj, noun)
}

func loadTagFromFile() (string, error) {
	data, err := os.ReadFile(TAG_FILE)
	if err != nil {
		return "", err
	}
	tag := strings.TrimSpace(string(data))
	if tag == "" {
		return "", fmt.Errorf("empty tag")
	}
	return tag, nil
}

func saveTagToFile(tag string) error {
	return os.WriteFile(TAG_FILE, []byte(tag), 0644)
}

func parseFlags(args []string) map[string]interface{} {
	var (
		detachShort, detachLong     bool
		stop                        bool
		intervalShort, intervalLong int
		tagShort, tagLong           string
		resetTag                    bool
	)

	fs := flag.NewFlagSet("agent", flag.ExitOnError)
	fs.BoolVar(&detachShort, "d", false, "Run in background (detached mode)")
	fs.BoolVar(&detachLong, "detach", false, "Run in background (detached mode)")
	fs.BoolVar(&stop, "stop", false, "Stop the running agent")
	fs.IntVar(&intervalShort, "i", 5000, "Set send interval (ms)")
	fs.IntVar(&intervalLong, "interval", 5000, "Set send interval (ms)")
	fs.StringVar(&tagShort, "t", "default_tag", "Set agent tag")
	fs.StringVar(&tagLong, "tag", "default_tag", "Set agent tag")
	fs.BoolVar(&resetTag, "reset-tag", false, "Reset saved agent tag")
	fs.Parse(args)

	lastArgs := strings.Join(args, " ")
	lastInterval := intervalShort
	if strings.LastIndex(lastArgs, "--interval") > strings.LastIndex(lastArgs, "-i") {
		lastInterval = intervalLong
	}

	lastTag := tagShort
	if strings.LastIndex(lastArgs, "--tag") > strings.LastIndex(lastArgs, "-t") {
		lastTag = tagLong
	}

	lastDetach := detachShort || detachLong
	if strings.LastIndex(lastArgs, "--detach") > strings.LastIndex(lastArgs, "-d") {
		lastDetach = detachLong
	}

	return map[string]interface{}{
		"detach":   lastDetach,
		"stop":     stop,
		"interval": lastInterval,
		"tag":      lastTag,
		"resetTag": resetTag,
	}
}

func getSendInterval(flags map[string]interface{}) time.Duration {
	if env := os.Getenv("SEND_INTERVAL"); env != "" {
		if ms, err := strconv.Atoi(env); err == nil {
			return time.Duration(ms) * time.Millisecond
		}
	}
	return time.Duration(flags["interval"].(int)) * time.Millisecond
}

func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func runDetached() {
	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("Failed to get executable path: %v", err)
	}
	exe, _ = filepath.Abs(exe)

	// Удаляем флаги -d и --detach из аргументов
	var filteredArgs []string
	for _, arg := range os.Args[1:] {
		if arg != "-d" && arg != "--detach" {
			filteredArgs = append(filteredArgs, arg)
		}
	}

	cmd := exec.Command(exe, filteredArgs...)
	cmd.Env = append(os.Environ(), "_DETACHED=1")

	if err := cmd.Start(); err != nil {
		log.Fatalf("Failed to start detached process: %v", err)
	}

	if err := os.WriteFile(PID_FILE, []byte(strconv.Itoa(cmd.Process.Pid)), 0644); err != nil {
		log.Printf("Warning: Failed to write PID file: %v", err)
	}

	fmt.Println("Agent started in background mode")
	os.Exit(0)
}

func writePID() {
	if err := os.WriteFile(PID_FILE, []byte(strconv.Itoa(os.Getpid())), 0644); err != nil {
		log.Printf("Warning: Failed to write PID file: %v", err)
	}
}

func listenForSignals(cancel context.CancelFunc) {
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, os.Interrupt, syscall.SIGTERM)
	<-ch
	cancel()
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

	if err := process.Signal(syscall.SIGTERM); err != nil {
		return fmt.Errorf("failed to stop process: %v", err)
	}

	// Удаляем PID файл
	if err := os.Remove(PID_FILE); err != nil {
		log.Printf("Warning: Failed to remove PID file: %v", err)
	}

	return nil
}

func isHelpRequested() bool {
	for _, arg := range os.Args[1:] {
		if arg == "-h" || arg == "--help" {
			return true
		}
	}
	return false
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
