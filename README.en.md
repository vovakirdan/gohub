# **📌 GoHub — Server Monitoring System**
> **"GoHub"** — **a server monitoring system** using **gRPC**, **PostgreSQL**, **Prometheus**, **WebSocket**, **React (Next.js)**, and **Docker**.

**Goal**: To develop a distributed monitoring system that collects metrics from agents on servers and sends them to a central service for display.

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
- [ ] Add a PostgreSQL database and store the history of metrics.
- [ ] Implement a web interface with React (Next.js) and graphs.
- [ ] Run everything in Docker (with PostgreSQL and Prometheus).
- [ ] Set up a notification system (email/Telegram).
