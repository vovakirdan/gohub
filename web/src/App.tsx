import { JSX, useEffect, useState } from 'react';
import MachineMonitor from './MachineMonitor';

// Тип для входящего сообщения с метриками
export type MetricMessage = {
  message: string;
  server_id: string;
  tag: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_usage: number;
  // Добавляем временную метку для построения графиков
  timestamp: number;
};

function App(): JSX.Element {
  // Состояние: словарь, где ключ – ID сервера, а значение – массив сообщений (временной ряд)
  const [machines, setMachines] = useState<Record<string, MetricMessage[]>>({});

  useEffect(() => {
    // Определяем URL для WebSocket (приоритет переменной окружения)
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://server:8080/ws';
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      // Разбираем полученное сообщение и добавляем временную метку
      const data = JSON.parse(event.data) as Omit<MetricMessage, 'timestamp'>;
      const metricData: MetricMessage = { ...data, timestamp: Date.now() };
      console.log("WS received:", metricData);

      // Обновляем данные для соответствующего сервера
      setMachines((prevMachines) => {
        // Берем предыдущий ряд для сервера или создаем новый
        const prevData = prevMachines[metricData.server_id] || [];
        // Ограничиваем длину временного ряда, например, до 100 значений
        const newData = [metricData, ...prevData].slice(0, 100);
        return { ...prevMachines, [metricData.server_id]: newData };
      });
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
    <div style={{ padding: '20px' }}>
      <h1>gRPC Metrics Monitor (React + TS)</h1>
      {/* Grid-расположение для компонентов мониторинга */}
      <div className="machine-grid">
        {Object.entries(machines).map(([serverId, messages]) => (
          <MachineMonitor key={serverId} serverId={serverId} messages={messages} />
        ))}
      </div>
    </div>
  );
}

export default App;
