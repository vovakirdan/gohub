package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib" // pgx driver
)

// Модель для результата
type MetricRow struct {
	ID           int64
	ServerID     string
	Tag          string
	CPUUsage     float64
	MemoryUsage  float64
	DiskUsage    float64
	NetworkUsage float64
	CreatedAt    string
}

type Storage struct {
	db *sql.DB
}

// NewStorage создает новое соединение с PostgreSQL
func NewStorage(dsn string) (*Storage, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open db: %w", err)
	}
	// Проверим, что соединение работает
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping db: %w", err)
	}
	return &Storage{db: db}, nil
}

// Проверим, создана ли таблица metrics
func (s *Storage) EnsureSchema(ctx context.Context) error {
	query := `
	CREATE TABLE IF NOT EXISTS metrics (
    	id SERIAL PRIMARY KEY,
		server_id TEXT NOT NULL,
		tag TEXT,
		cpu_usage DOUBLE PRECISION NOT NULL,
		memory_usage DOUBLE PRECISION NOT NULL,
		disk_usage DOUBLE PRECISION NOT NULL,
		network_usage DOUBLE PRECISION NOT NULL,
		created_at TIMESTAMPTZ DEFAULT now()
	);
	`
	_, err := s.db.ExecContext(ctx, query)
	return err
}

// SaveMetrics сохраняет метрики в таблицу metrics
func (s *Storage) SaveMetrics(
	ctx context.Context,
	serverID, tag string,
	cpu, mem, disk, net float64,
) error {
	const query = `
INSERT INTO metrics (
  server_id, tag, cpu_usage, memory_usage, disk_usage, network_usage
) 
VALUES($1, $2, $3, $4, $5, $6)
`
	_, err := s.db.ExecContext(ctx, query,
		serverID, tag, cpu, mem, disk, net,
	)
	return err
}

// LoadMetrics получает последние N записей (можно фильтровать по server_id/tag)
func (s *Storage) LoadMetrics(ctx context.Context, serverID, tag string, limit int64) ([]MetricRow, error) {
	query := `
SELECT id, server_id, tag, cpu_usage, memory_usage, disk_usage, network_usage, created_at
FROM metrics
`
	args := []interface{}{}
	conditions := []string{}
	paramIndex := 1

	// Фильтр по server_id
	if serverID != "" {
		conditions = append(conditions, fmt.Sprintf("server_id = $%d", paramIndex))
		args = append(args, serverID)
		paramIndex++
	}
	// Фильтр по tag
	if tag != "" {
		conditions = append(conditions, fmt.Sprintf("tag = $%d", paramIndex))
		args = append(args, tag)
		paramIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + joinConditions(conditions, " AND ")
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d::bigint", paramIndex)
	args = append(args, limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []MetricRow
	for rows.Next() {
		var r MetricRow
		err := rows.Scan(
			&r.ID, &r.ServerID, &r.Tag,
			&r.CPUUsage, &r.MemoryUsage, &r.DiskUsage, &r.NetworkUsage,
			&r.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

// LoadServers получает список всех серверов с тегами
func (s *Storage) LoadServersWithTags(ctx context.Context) ([]struct{ ServerID, Tag string }, error) {
	query := `
	SELECT DISTINCT server_id, tag FROM metrics
	`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var servers []struct{ ServerID, Tag string }
	for rows.Next() {
		var serverID string
		var tag string
		if err := rows.Scan(&serverID, &tag); err != nil {
			return nil, err
		}
		servers = append(servers, struct{ ServerID, Tag string }{ServerID: serverID, Tag: tag})
	}
	return servers, nil
}

// joinConditions объединяет условия SQL
func joinConditions(conds []string, sep string) string {
	return strings.Join(conds, sep)
}
