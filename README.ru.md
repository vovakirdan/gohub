# **📌 GoHub — Система мониторинга серверов**
> **"GoHub"** — **система мониторинга серверов** с использованием **gRPC**, **PostgreSQL**, **Prometheus**, **WebSocket**, **React (Next.js)** и **Docker**.

**Цель**: Разработать распределённую систему мониторинга, которая собирает метрики с агентов на серверах и передаёт их в центральный сервис для отображения.

# Запуск
1. Собираем и поднимаем сервисы (postgres + gRPC-server)
С локальной базой:
```
docker-compose up --build
```
PostgreSQL будет на 5432 (локально), gRPC-сервер на 50051

С внешней базой (перечисляем сервисы, которые нужно запустить):
```
docker-compose up server web prometheus grafana --build
```
PostgreSQL будет на 5432 (внешнее), gRPC-сервер на 50051

* Увидеть фронт - http://localhost:3000
* Увидеть Prometheus - http://localhost:9090
* Увидеть Grafana - http://localhost:3001

2. Проверить логи:
```
docker-compose logs -f server
```
Увидите "gRPC server is running on :50051"

# Запуск агентов:
* [Компиляция](#компиляция)
* [Используем готовый последний релиз](#используем-готовый-последний-релиз)
## Компиляция
> [!NOTE]
> Убедитесь, что у вас установлен Go 1.20+
```bash
SEND_INTERVAL=1000 AGENT_TAG=my_tag go build -o agent ./cmd/agent/main.go
```

## Используем готовый последний релиз (только для Debian/Ubuntu)
> [!NOTE]
> Последний релиз доступен на [https://github.com/vovakirdan/gohub/releases](https://github.com/vovakirdan/gohub/releases)
```bash
curl -L -o agent https://github.com/vovakirdan/gohub/releases/download/v2025.03.13-130803/agent.run
chmod +x agent
SEND_INTERVAL=1000 AGENT_TAG=my_tag ./agent
```
* `SEND_INTERVAL` - интервал отправки метрик в миллисекундах
* `AGENT_TAG` - тег агента
После запуска агента, вы сможете увидеть его в списке серверов [на фронтенде](http://localhost:3000/).

## Запуск агента в фоновом режиме
```bash
./agent &
```
## Остановка агента
```bash
kill -9 $(cat PID_FILE)
```
Или
```bash
./agent --stop
```

## Запуск агента в режиме прямого запуска
```bash
./agent
```

### **🛠 Стек технологий**
1. **Go (gRPC-сервер)**
   - Реализует API для агентов и фронтенда.
   - Работает с PostgreSQL.
   - Поддерживает стриминг через WebSockets.
   - Экспортирует метрики в Prometheus.

2. **gRPC (protobuf)**
   - Определяет API взаимодействия агентов с сервером.

3. **PostgreSQL (хранение данных)**
   - Сохраняет историю метрик.

4. **Prometheus + Grafana**
   - Хранит метрики.
   - Визуализирует данные.

5. **WebSocket (реактивное обновление интерфейса)**
   - Позволяет в реальном времени отображать обновления на фронтенде.

6. **React (Next.js, TypeScript)**
   - Интерфейс системы.
   - Дашборд с метриками.

7. **Docker**
   - Запуск сервиса в контейнерах.

---

### **Гайд по конфигурации**

Наше приложение читает настройки из **`config.yaml`** и переменных окружения через библиотеку [spf13/viper](https://github.com/spf13/viper).

1. **config.yaml** (расположен в `./config/config.yaml`) задаёт дефолтные параметры:
   ```yaml
   app:
     name: "GoHub"

   database:
     use_external: false
     external_dsn: ""
     host: "localhost"
     port: 5432
     user: "gohub"
     password: "gohub"
     dbname: "gohub"
     sslmode: "disable"
   ```

2. **Переменные окружения** переопределяют соответствующие поля.  
   - Пример: `DATABASE__HOST=myhost` заменит `database.host` из файла.  
   - Если нужно использовать внешнюю БД, установите:
     ```
     DATABASE__USE_EXTERNAL=true
     DATABASE__EXTERNAL_DSN=postgres://user:pass@somehost:5432/proddb?sslmode=disable
     ```
     Тогда приложение не будет обращаться к локальному Postgres.

3. **Приоритет**: значения из **переменных окружения** важнее, чем из `config.yaml`.  

4. **Миграции**: При запуске приложение проверяет/создаёт таблицу `metrics` (или вы можете использовать собственную систему миграций).  
   - Если `use_external=true`, убедитесь, что у вас есть права на создание/изменение таблиц в внешней базе.

### **Как пользоваться**

- **Локальный режим** (поднимаем Postgres в Docker):
  ```bash
  docker-compose up
  ```
  По умолчанию `use_external=false`, и приложение использует DSN `postgres://gohub:gohub@db:5432/gohub?sslmode=disable`.

- **Внешняя БД**:
  1. Настройте `.env` или системные переменные окружения:
     ```
     DATABASE__USE_EXTERNAL=true
     DATABASE__EXTERNAL_DSN=postgres://user:pass@my-external-db:5432/proddb?sslmode=disable
     ```
  2. Запустите `docker-compose up server web prometheus grafana` без `db` (или используйте профили).  
  3. Приложение подключится к указанной базе, создаст таблицу `metrics` (если нет).

# **🎯 Функционал**
### 🔹 gRPC API (Go)
✅ Агенты подключаются к серверу и отправляют метрики через gRPC.  
✅ Сервер принимает метрики и сохраняет их в PostgreSQL.  
✅ Фронтенд получает обновления через WebSocket.  
✅ Метрики можно запрашивать через REST/gRPC API.  
✅ Сервер экспортирует метрики в Prometheus.

### 🔹 Мониторинг серверов (Агент на Go)
✅ Запускается на сервере (Linux/Windows/Mac).  
✅ Считывает:
- Загрузку процессора
- Использование оперативной памяти
- Загрузку сети
- Использование диска  

✅ Отправляет данные на gRPC-сервер.  

### 🔹 UI (React + WebSocket)
✅ Отображает список серверов.  
✅ Реалтайм-графики загруженности.  
✅ Уведомления при высоких нагрузках.  

---

# **📁 Структура проекта**
```
gohub/
│── cmd/
│   ├── server/            # Основной gRPC-сервер
│   ├── agent/             # Агент для сбора метрик
│── internal/
│   ├── api/               # gRPC-протокол
│   ├── db/                # Логика работы с PostgreSQL
│   ├── metrics/           # Обработка метрик
│   ├── websocket/         # WebSocket-сервер
│── web/                   # Фронтенд (React/Next.js)
│── deploy/                # Docker-compose, Kubernetes
│── config.yaml            # Конфигурация сервиса
│── Dockerfile             # Образ для сервера
│── docker-compose.yml     # Запуск в контейнерах
│── README.md              # Документация
```

---

# **🔥 Как это будет работать?**
1. Запускаем **GoHub Server** (`server/`) — он принимает запросы от агентов.
2. На каждом сервере разворачиваем **GoHub Agent** (`agent/`), который собирает метрики.
3. Фронтенд (React) получает данные через **WebSocket** и обновляет графики.
4. Все метрики можно анализировать через **Prometheus + Grafana**.

# **📌 Дальнейшие шаги**
- [x] Добавить базу данных PostgreSQL и хранить историю метрик.
- [x] Реализовать Web-интерфейс с React (Next.js) и графиками.
- [x] Запуск всего в Docker (с PostgreSQL и Prometheus).
- [ ] Настроить систему уведомлений (email/Telegram).
