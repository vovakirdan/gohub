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

	// Фильтр по server_id
	if serverID != "" {
		conditions = append(conditions, "server_id = $1")
		args = append(args, serverID)
	}
	// Фильтр по tag
	if tag != "" {
		conditions = append(conditions, "tag = $1")
		args = append(args, tag)
	}

	if len(conditions) > 0 {
		query += " WHERE " + joinConditions(conditions, " AND ")
	}

	query += " ORDER BY created_at DESC LIMIT $1"
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

// joinConditions объединяет условия SQL
func joinConditions(conds []string, sep string) string {
	return strings.Join(conds, sep)
}
