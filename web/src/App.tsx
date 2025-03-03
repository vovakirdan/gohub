import { JSX, useEffect, useState } from 'react';
import MachineMonitor from './MachineMonitor';
import { MetricMessage, ServerRow, MetricRow } from './types';

export default function App(): JSX.Element {
  // =======================
  // Состояния
  // =======================

  // Словарь "server_id||tag" -> массив метрик (исторические + WebSocket)
  const [machines, setMachines] = useState<Record<string, MetricMessage[]>>({});

  // Состояние для переключения между grid и list
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Словарь serverID -> список тегов
  const [serversMap, setServersMap] = useState<Map<string, string[]>>(new Map());

  // Списки выбора
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Количество загружаемых данных
  const [loadMetricsCount, setLoadMetricsCount] = useState<number>(100);

  useEffect(() => {
    // 1) Загружаем список серверов с тегами
    fetch(`http://localhost:8080/api/list_servers`)
      .then((res) => res.json())
      .then((data: ServerRow[]) => {
        // Преобразуем массив вида [{ServerID, Tag}, ...]
        // в Map: serverID -> [tag1, tag2, ...]
        const map = new Map<string, string[]>();
        data.forEach((row) => {
          if (!map.has(row.ServerID)) {
            map.set(row.ServerID, []);
          }
          const tags = map.get(row.ServerID);
          if (tags && !tags.includes(row.Tag)) {
            tags.push(row.Tag);
            map.set(row.ServerID, tags);
          }
        });
        setServersMap(map);
      })
      .catch((err) => console.error('Error fetching server list:', err));

    // 2) Подключаемся к WebSocket, чтобы получать "живые" данные
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://server:8080/ws';
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as Partial<MetricMessage>;
      if (!data.server_id || !data.tag) {
        // Если не хватает полей, просто пропустим
        return;
      }
      const metricData: MetricMessage = {
        message: "Metric data received",
        server_id: data.server_id,
        tag: data.tag,
        cpu_usage: data.cpu_usage || 0,
        memory_usage: data.memory_usage || 0,
        disk_usage: data.disk_usage || 0,
        network_usage: data.network_usage || 0,
        timestamp: Date.now(),
      };
      // console.log('WS received:', metricData);

      // Формируем ключ "server_id||tag"
      const machineKey = `${metricData.server_id}||${metricData.tag}`;
      setMachines((prev) => {
        const oldData = prev[machineKey] || [];
        // Новая запись – в начало массива
        const newData = [metricData, ...oldData].slice(0, 200);
        return { ...prev, [machineKey]: newData };
      });
    };

    socket.onopen = () => {
      console.log('WebSocket connected:', wsUrl);
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    socket.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      socket.close();
    };
  }, []);

  // =======================
  // Обработчики выбора (multi-select)
  // =======================

  // При выборе серверов нужно собрать все теги для них и положить в availableTags
  const handleServersChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(event.target.selectedOptions).map((o) => o.value);
    setSelectedServers(options);

    // Собираем теги для всех выделенных серверов
    const tagsSet = new Set<string>();
    options.forEach((serverID) => {
      const tags = serversMap.get(serverID) || [];
      tags.forEach((t) => tagsSet.add(t));
    });
    setAvailableTags(Array.from(tagsSet));
    setSelectedTags([]); // сбрасываем выбор тегов
  };

  // При выборе тегов
  const handleTagsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(event.target.selectedOptions).map((o) => o.value);
    setSelectedTags(options);
  };

  // При изменении количества загружаемых данных
  const handleLoadMetricsCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLoadMetricsCount(parseInt(event.target.value));
  };

  // =======================
  // Загрузка исторических метрик
  // =======================
  const loadMetrics = () => {
    // Для каждого выбранного сервера и тега делаем запрос
    selectedServers.forEach((serverID) => {
      selectedTags.forEach((tag) => {
        const query = `server_id=${serverID}&tag=${tag}&limit=${loadMetricsCount}`;
        fetch(`http://localhost:8080/api/metrics?${query}`)
          .then((res) => res.json())
          .then((data: MetricRow[]) => {
            // Преобразуем MetricRow в MetricMessage
            const historical = data.map((row) => ({
              server_id: row.ServerID,
              tag: row.Tag,
              cpu_usage: row.CPUUsage,
              memory_usage: row.MemoryUsage,
              disk_usage: row.DiskUsage,
              network_usage: row.NetworkUsage,
              timestamp: new Date(row.CreatedAt).getTime(),
            })) as MetricMessage[];

            // Ключ "server_id||tag"
            const machineKey = `${serverID}||${tag}`;
            setMachines((prev) => {
              // Если в prev есть что-то, добавим новые данные
              const oldData = prev[machineKey] || [];
              // Объединим
              const combined = [...oldData, ...historical];
              return { ...prev, [machineKey]: combined };
            });
          })
          .catch((err) => console.error(`Error fetching metrics for ${serverID}||${tag}:`, err));
      });
    });
  };

  // =======================
  // Переключатель layout (grid / list)
  // =======================
  const toggleLayout = () => {
    setLayoutMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
  };

  // =======================
  // Рендер
  // =======================
  return (
    <div style={{ padding: '20px' }}>
      <h1>gRPC Metrics Monitor (React + TS)</h1>

      {/* 1) Переключатель layout */}
      <button onClick={toggleLayout} style={{ marginBottom: '20px' }}>
        Layout: {layoutMode === 'grid' ? 'Grid → List' : 'List → Grid'}
      </button>

      {/* 2) Выбор серверов */}
      <div style={{ marginBottom: '10px' }}>
        <label>
          Select servers:
          <br />
          <select
            multiple
            size={4} // Просто пример, чтобы было видно несколько строк
            value={selectedServers}
            onChange={handleServersChange}
            style={{ minWidth: '200px' }}
          >
            {Array.from(serversMap.keys()).map((serverID) => (
              <option key={serverID} value={serverID}>
                {serverID}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* Укажем количество загружаемых данных */}
      <div style={{ marginBottom: '10px' }}>
        <label>
          Load metrics:
          <br />
          <input type="number" value={loadMetricsCount} onChange={handleLoadMetricsCountChange} />
        </label>
      </div>
      {/* 3) Выбор тегов для выбранных серверов */}
      <div style={{ marginBottom: '10px' }}>
        <label>
          Select tags:
          <br />
          <select
            multiple
            size={4}
            value={selectedTags}
            onChange={handleTagsChange}
            style={{ minWidth: '200px' }}
          >
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 4) Кнопка для загрузки исторических метрик */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={loadMetrics} disabled={!selectedServers.length || !selectedTags.length}>
          Load metrics
        </button>
      </div>

      {/* 5) Список панелей MachineMonitor */}
      <div className={layoutMode === 'grid' ? 'machine-grid' : 'machine-list'}>
        {Object.entries(machines).map(([machineKey, data]) => {
          const [serverId, tag] = machineKey.split('||');
          return (
            <MachineMonitor
              key={machineKey}
              serverId={serverId}
              tag={tag}
              messages={data}
            />
          );
        })}
      </div>
    </div>
  );
}
