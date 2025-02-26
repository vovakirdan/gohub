# ---- Шаг сборки ----
FROM golang:1.23-alpine AS builder
WORKDIR /app

# Копируем go.mod и go.sum
COPY go.mod go.sum ./
RUN go mod download

# Копируем остальной код
COPY . .

# Собираем бинарник сервера
RUN go build -o /bin/server cmd/server/main.go

# ---- Шаг запуска ----
FROM alpine:3.17
WORKDIR /app

# Копируем бинарник из builder
COPY --from=builder /bin/server /app/server

# Открываем порт 50051
EXPOSE 50051

# Запуск
CMD ["/app/server"]
