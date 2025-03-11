package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"gohub/internal/config"
	"gohub/internal/db"
	"gohub/internal/server"
	ws "gohub/internal/websocket"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// corsMiddleware оборачивает http.Handler, устанавливая заголовки для поддержки CORS.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Разрешаем запросы с любого домена
		w.Header().Set("Access-Control-Allow-Origin", "*")
		// Разрешённые HTTP-методы
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		// Разрешённые заголовки
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		// Если это preflight-запрос, возвращаем 200
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	cfg, err := config.LoadConfig("./config")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Подключаемся к БД
	var dsn string
	if cfg.Database.UseExternal && cfg.Database.ExternalDSN != "" {
		// Используем внешнюю базу, если она указана в конфиге
		dsn = cfg.Database.ExternalDSN
		fmt.Println("Using external DB:", dsn)
	} else {
		// Собираем локальный DSN
		dsn = fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
			cfg.Database.User,
			cfg.Database.Password,
			cfg.Database.Host,
			cfg.Database.Port,
			cfg.Database.DBName,
			cfg.Database.SSLMode,
		)
		fmt.Println("Using local DB DSN:", dsn)
	}
	storage, err := db.NewStorage(dsn)
	if err != nil {
		log.Fatalf("Failed to connect db: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err = storage.EnsureSchema(ctx)
	if err != nil {
		log.Fatalf("Failed to ensure schema: %v", err)
	}

	// Инициализируем WebSocket-хаб
	hub := ws.NewHub()

	// Инициализируем gRPC-сервер
	go func() {
		// Создаём новый mux для регистрации маршрутов
		mux := http.NewServeMux()

		mux.HandleFunc("/api/metrics", func(w http.ResponseWriter, r *http.Request) {
			// Прочитаем query-параметры: server_id, tag, limit
			q := r.URL.Query()
			serverID := q.Get("server_id")
			tag := q.Get("tag")
			limitStr := q.Get("limit")
			if limitStr == "" {
				limitStr = "50"
			}
			limit, _ := strconv.ParseInt(limitStr, 10, 64)

			// Вызываем LoadMetrics
			data, err := storage.LoadMetrics(r.Context(), serverID, tag, limit)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				fmt.Fprintf(w, "DB error: %v", err)
				return
			}

			// Возвращаем JSON
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(data)
		})
		mux.HandleFunc("/api/list_servers", func(w http.ResponseWriter, r *http.Request) {
			data, err := storage.LoadServersWithTags(r.Context())
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				fmt.Fprintf(w, "DB error: %v", err)
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(data)
		})

		mux.HandleFunc("/ws", hub.HandleConnections)
		mux.Handle("/", http.FileServer(http.Dir("./web"))) // статика в ./web

		corsMux := corsMiddleware(mux)

		log.Println("HTTP/WebSocket server on :8080")
		if err := http.ListenAndServe(":8080", corsMux); err != nil {
			log.Fatalf("ListenAndServe error: %v", err)
		}
	}()

	srv := server.NewMetricsServer(storage, hub)

	go func() {
		http.Handle("/metrics", promhttp.Handler())
		log.Println("Prometheus metrics on :2112/metrics")
		if err := http.ListenAndServe(":2112", nil); err != nil {
			log.Fatalf("Prometheus metrics server error: %v", err)
		}
	}()

	// Запускаем gRPC
	if err := srv.Start(); err != nil {
		log.Fatalf("Failed to start gRPC server: %v", err)
	}
}
