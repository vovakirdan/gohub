import { JSX, useEffect, useState } from 'react';

type MetricMessage = {
  message: string;
  server_id: string;
  tag: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_usage: number;
};

function App(): JSX.Element {
  const [messages, setMessages] = useState<MetricMessage[]>([]);

  useEffect(() => {
    // 1) Определяем адрес вебсокета
    // Во время Docker-запуска: ws://server:8080/ws
    // Локально без Docker:     ws://localhost:8080/ws
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://server:8080/ws';    
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as MetricMessage;
      console.log("WS received:", data);

      // 2) Сохраняем новую метрику в массив
      setMessages((prev) => [data, ...prev]);
    };

    socket.onopen = () => {
      console.log("WebSocket connected:", wsUrl);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    socket.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div style={{ margin: '20px' }}>
      <h1>gRPC Metrics Monitor (React + TS)</h1>
      <p>Messages received: {messages.length}</p>
      {messages.map((m, index) => (
        <div key={index} style={{ border: '1px solid #ccc', marginBottom: '8px', padding: '8px' }}>
          <p><strong>Host:</strong> {m.server_id}</p>
          <p><strong>Tag:</strong> {m.tag}</p>
          <p><strong>CPU:</strong> {m.cpu_usage.toFixed(2)}%</p>
          <p><strong>MEM:</strong> {m.memory_usage.toFixed(2)}%</p>
          <p><strong>DISK:</strong> {m.disk_usage.toFixed(2)}%</p>
          <p><strong>NETWORK:</strong> {m.network_usage.toFixed(0)} bytes</p>
        </div>
      ))}
    </div>
  );
}

export default App;
