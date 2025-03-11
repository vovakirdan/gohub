# **📌 GoHub — Server Monitoring System**
> **"GoHub"** — **a server monitoring system** using **gRPC**, **PostgreSQL**, **Prometheus**, **WebSocket**, **React (Next.js)**, and **Docker**.

**Goal**: To develop a distributed monitoring system that collects metrics from agents on servers and sends them to a central service for display.

### Run
```
docker compose up --build
```
To see the frontend, open the browser and go to `http://localhost:3000`.
To see Prometheus, open the browser and go to `http://localhost:9090`.
To see Grafana, open the browser and go to `http://localhost:3001`.

### **🛠 Technology Stack**
1. **Go (gRPC server)**
   - Implements API for agents and frontend.
   - Works with PostgreSQL.
   - Supports streaming via WebSockets.
   - Exports metrics to Prometheus.

2. **gRPC (protobuf)**
   - Defines the API for agent-server interaction.

3. **PostgreSQL (data storage)**
   - Stores the history of metrics.

4. **Prometheus + Grafana**
   - Stores metrics.
   - Visualizes data.

5. **WebSocket (reactive interface updates)**
   - Allows real-time updates to be displayed on the frontend.

6. **React (Next.js, TypeScript)**
   - The system interface.
   - Dashboard with metrics.

7. **Docker**
   - Runs the service in containers.

---

### **Configuration Guide**

Our application reads settings from **`config.yaml`** and environment variables using the [spf13/viper](https://github.com/spf13/viper) library.

1. **config.yaml** (located in `./config/config.yaml`) sets the default parameters:
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

2. **Environment variables** override the corresponding fields.  
   - Example: `DATABASE__HOST=myhost` will replace `database.host` from the file.  
   - If you need to use an external database, set:
     ```
     DATABASE__USE_EXTERNAL=true
     DATABASE__EXTERNAL_DSN=postgres://user:pass@somehost:5432/proddb?sslmode=disable
     ```
     Then the application will not connect to the local Postgres.

3. **Priority**: values from **environment variables** take precedence over those in `config.yaml`.  

4. **Migrations**: Upon startup, the application checks/creates the `metrics` table (or you can use your own migration system).  
   - If `use_external=true`, make sure you have permissions to create/modify tables in the external database.

### **How to Use**

- **Local mode** (running Postgres in Docker):
  ```bash
  docker-compose up
  ```
  By default, `use_external=false`, and the application uses the DSN `postgres://gohub:gohub@db:5432/gohub?sslmode=disable`.

- **External database**:
  1. Configure `.env` or system environment variables:
     ```
     DATABASE__USE_EXTERNAL=true
     DATABASE__EXTERNAL_DSN=postgres://user:pass@my-external-db:5432/proddb?sslmode=disable
     ```
  2. Run `docker-compose up server web prometheus grafana` without `db` (or use profiles).  
  3. The application will connect to the specified database and create the `metrics` table (if it does not exist).

---

# **🎯 Functionality**
### 🔹 gRPC API (Go)
✅ Agents connect to the server and send metrics via gRPC.  
✅ The server receives metrics and stores them in PostgreSQL.  
✅ The frontend receives updates via WebSocket.  
✅ Metrics can be queried via REST/gRPC API.  
✅ The server exports metrics to Prometheus.

### 🔹 Server Monitoring (Agent in Go)
✅ Runs on the server (Linux/Windows/Mac).  
✅ Reads:
- CPU load
- Memory usage
- Network load
- Disk usage  

✅ Sends data to the gRPC server.  

### 🔹 UI (React + WebSocket)
✅ Displays a list of servers.  
✅ Real-time load graphs.  
✅ Notifications for high loads.  

---

# **📁 Project Structure**
```
gohub/
│── cmd/
│   ├── server/            # Main gRPC server
│   ├── agent/             # Agent for collecting metrics
│── internal/
│   ├── api/               # gRPC protocol
│   ├── db/                # Logic for working with PostgreSQL
│   ├── metrics/           # Metrics processing
│   ├── websocket/         # WebSocket server
│── web/                   # Frontend (React/Next.js)
│── deploy/                # Docker-compose, Kubernetes
│── config.yaml            # Service configuration
│── Dockerfile             # Image for the server
│── docker-compose.yml     # Run in containers
│── README.md              # Documentation
```

---

# **🔥 How It Works**
1. Start the **GoHub Server** (`server/`) — it accepts requests from agents.
2. Deploy the **GoHub Agent** (`agent/`) on each server, which collects metrics.
3. The frontend (React) receives data via **WebSocket** and updates graphs.
4. All metrics can be analyzed through **Prometheus + Grafana**.

# **📌 Next Steps**
- [x] Add a PostgreSQL database and store the history of metrics.
- [x] Implement a web interface with React (Next.js) and graphs.
- [x] Run everything in Docker (with PostgreSQL and Prometheus).
- [ ] Set up a notification system (email/Telegram).
