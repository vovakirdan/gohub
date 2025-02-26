package db

import (
    "context"
    "database/sql"
    "fmt"

    _ "github.com/jackc/pgx/v5/stdlib" // pgx driver
)

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
    serverID string,
    cpu, mem, disk, net float64,
) error {
    const query = `
        INSERT INTO metrics(server_id, cpu_usage, memory_usage, disk_usage, network_usage)
        VALUES($1, $2, $3, $4, $5)
    `
    _, err := s.db.ExecContext(ctx, query, serverID, cpu, mem, disk, net)
    return err
}
