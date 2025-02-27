import { JSX, useEffect, useState } from 'react';
import MachineMonitor from './MachineMonitor';
import { MetricMessage } from './types';


function App(): JSX.Element {
  // Состояние: словарь, где ключ – ID сервера, а значение – массив сообщений (временной ряд)
  const [machines, setMachines] = useState<Record<string, MetricMessage[]>>({});
  // Состояние для переключения между grid и list режимами
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    // Определяем URL для WebSocket (приоритет переменной окружения)
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://server:8080/ws';
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      // Разбираем полученное сообщение и добавляем временную метку
      const data = JSON.parse(event.data) as Omit<MetricMessage, 'timestamp'>;
      const metricData: MetricMessage = { ...data, timestamp: Date.now() };
      console.log("WS received:", metricData);

      // Формируем ключ как комбинацию server_id и tag
      const machineKey = `${metricData.server_id}||${metricData.tag}`;
      setMachines((prevMachines) => {
        const prevData = prevMachines[machineKey] || [];
        // Ограничиваем длину временного ряда до 100 значений
        const newData = [metricData, ...prevData].slice(0, 100);
        return { ...prevMachines, [machineKey]: newData };
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

  const toggleLayout = () => {
    setLayoutMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>gRPC Metrics Monitor (React + TS)</h1>
      <p>Количество групп: {Object.keys(machines).length}</p>
      {/* Кнопка для переключения отображения */}
      <button onClick={toggleLayout} style={{ marginBottom: '20px' }}>
        Переключить на {layoutMode === 'grid' ? 'список' : 'сетка'}
      </button>
      {/* Контейнер с динамическим классом в зависимости от режима отображения */}
      <div className={layoutMode === 'grid' ? 'machine-grid' : 'machine-list'}>
        {Object.entries(machines).map(([machineKey, messages]) => {
          // Извлекаем server_id и tag из ключа
          const [serverId, tag] = machineKey.split('||');
          return (
            <MachineMonitor
              key={machineKey}
              serverId={serverId}
              tag={tag}
              messages={messages}
            />
          );
        })}
      </div>
    </div>
  );
}

export default App;
