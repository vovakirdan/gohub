import { JSX, useEffect, useRef, useState } from 'react';
import MachineMonitor from './MachineMonitor';
import { MetricMessage, ServerRow, MetricRow } from './types';

function App(): JSX.Element {
  // Хранит метрики по ключу "server_id||tag"
  const [machines, setMachines] = useState<Record<string, MetricMessage[]>>({});
  // Режим отображения: сетка (grid) или список (list)
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  // Структура серверов: Map { server_id => [tag1, tag2, ...] }
  const [servers, setServers] = useState<Map<string, string[]>>(new Map());
  // Выбранные серверы (массив server_id)
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  // Для каждого выбранного сервера – выбранные тэги
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});

  // Рефы для актуальности выбранных серверов/тэгов внутри WS callback
  const selectedServersRef = useRef(selectedServers);
  const selectedTagsRef = useRef(selectedTags);
  useEffect(() => {
    selectedServersRef.current = selectedServers;
    selectedTagsRef.current = selectedTags;
  }, [selectedServers, selectedTags]);
  const serverSelectRef = useRef<HTMLSelectElement>(null);

  // Загружаем список серверов и их тэгов
  useEffect(() => {
    fetch(`http://localhost:8080/api/list_servers`)
      .then((res) => res.json())
      .then((data: ServerRow[]) => {
        const map = new Map<string, string[]>();
        data.forEach(row => {
          if (map.has(row.ServerID)) {
            const tags = map.get(row.ServerID)!;
            if (!tags.includes(row.Tag)) {
              tags.push(row.Tag);
            }
          } else {
            map.set(row.ServerID, [row.Tag]);
          }
        });
        setServers(map);
      })
      .catch(err => console.error("Error fetching server list:", err));
  }, []);

  // Логируем размеры server select для проверки
  useEffect(() => {
    if (serverSelectRef.current) {
      console.log("Server select dimensions:", {
        width: serverSelectRef.current.offsetWidth,
        height: serverSelectRef.current.offsetHeight,
      });
    }
  }, [selectedServers, servers]);

  // При выборе серверов/тэгов – загружаем исторические метрики для каждой комбинации
  useEffect(() => {
    selectedServers.forEach(server => {
      const tags = selectedTags[server] || [];
      tags.forEach(tag => {
        const machineKey = `${server}||${tag}`;
        fetch(`http://localhost:8080/api/metrics?server_id=${server}&tag=${tag}&limit=100`)
          .then((res) => res.json())
          .then((data: MetricRow[]) => {
            const historical = data.map(row => ({
              server_id: row.ServerID,
              tag: row.Tag,
              cpu_usage: row.CPUUsage,
              memory_usage: row.MemoryUsage,
              disk_usage: row.DiskUsage,
              network_usage: row.NetworkUsage,
              timestamp: new Date(row.CreatedAt).getTime()
            } as MetricMessage));
            setMachines(prev => ({
              ...prev,
              [machineKey]: historical
            }));
          })
          .catch(err => console.error("Error fetching historical metrics for", machineKey, err));
      });
    });
  }, [selectedServers, selectedTags]);

  // Устанавливаем WebSocket для получения новых метрик в реальном времени
  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://server:8080/ws';
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as Omit<MetricMessage, 'timestamp'>;
      const metricData: MetricMessage = { ...data, timestamp: Date.now() };
      console.log("WS received:", metricData);

      // Обновляем данные только если сервер и тэг выбраны
      if (
        selectedServersRef.current.includes(metricData.server_id) &&
        selectedTagsRef.current[metricData.server_id]?.includes(metricData.tag)
      ) {
        const machineKey = `${metricData.server_id}||${metricData.tag}`;
        setMachines((prevMachines) => {
          const prevData = prevMachines[machineKey] || [];
          const newData = [metricData, ...prevData].slice(0, 100);
          return { ...prevMachines, [machineKey]: newData };
        });
      }
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
    setLayoutMode(prev => (prev === 'grid' ? 'list' : 'grid'));
  };

  // Обработчик изменения выбранных серверов
  const handleServerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions);
    const selected = options.map(option => option.value);
    setSelectedServers(selected);
    // Если сервер снят – удаляем его выбранные тэги
    setSelectedTags(prev => {
      const newSelected: Record<string, string[]> = {};
      selected.forEach(server => {
        if (prev[server]) {
          newSelected[server] = prev[server];
        }
      });
      return newSelected;
    });
  };

  // Обработчик изменения выбранных тэгов для конкретного сервера
  const handleTagChange = (server: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions);
    const selected = options.map(option => option.value);
    setSelectedTags(prev => ({ ...prev, [server]: selected }));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>gRPC Metrics Monitor (React + TS)</h1>

      {/* Выпадающий список для выбора серверов */}
      <div style={{ marginBottom: '20px' }}>
        <label>
          Выберите серверы:
          <select
            multiple
            ref={serverSelectRef}
            value={selectedServers}
            onChange={handleServerChange}
          >
            {Array.from(servers.keys()).map(server => (
              <option key={server} value={server}>
                {server}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Для каждого выбранного сервера – выпадающий список для выбора тэгов */}
      {selectedServers.map(server => (
        <div key={server} style={{ marginBottom: '20px' }}>
          <label>
            Выберите тэги для сервера {server}:
            <select
              multiple
              value={selectedTags[server] || []}
              onChange={(e) => handleTagChange(server, e)}
            >
              {servers.get(server)?.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}

      {/* Кнопка для переключения отображения */}
      <button onClick={toggleLayout} style={{ marginBottom: '20px' }}>
        Переключить на {layoutMode === 'grid' ? 'список' : 'сеть'}
      </button>

      <p>
        Количество выбранных групп:{' '}
        {selectedServers.reduce((acc, server) => acc + (selectedTags[server]?.length || 0), 0)}
      </p>

      {/* Отображение панелей для каждой выбранной комбинации server||tag */}
      <div className={layoutMode === 'grid' ? 'machine-grid' : 'machine-list'}>
        {selectedServers.flatMap(server =>
          (selectedTags[server] || []).map(tag => {
            const machineKey = `${server}||${tag}`;
            return (
              <MachineMonitor
                key={machineKey}
                serverId={server}
                tag={tag}
                messages={machines[machineKey] || []}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default App;
