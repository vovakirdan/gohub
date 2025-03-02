import { JSX, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { MetricMessage } from './types';

// Подключаем необходимые компоненты Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Регистрируем их в Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type MachineMonitorProps = {
  serverId: string;
  tag: string;
  messages: MetricMessage[];
};

export default function MachineMonitor(props: MachineMonitorProps): JSX.Element {
  const { serverId, tag, messages } = props;

  // Состояния для показа/скрытия отдельных графиков
  const [showCpu, setShowCpu] = useState<boolean>(true);
  const [showMemory, setShowMemory] = useState<boolean>(true);
  const [showDisk, setShowDisk] = useState<boolean>(true);
  const [showNetwork, setShowNetwork] = useState<boolean>(true);

  // Сортируем так, чтобы самые старые были слева (по возрастанию времени)
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  // Формируем массив меток (для оси X)
  const labels: Array<string> = sortedMessages.map((msg) =>
    new Date(msg.timestamp).toLocaleTimeString()
  );

  // CPU и Memory рисуем "сглаженные" линии с заливкой
  const cpuData = {
    labels,
    datasets: [
      {
        label: 'CPU Usage (%)',
        data: sortedMessages.map((msg) => msg.cpu_usage),
        fill: true,
        tension: 0.4,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };
  const memoryData = {
    labels,
    datasets: [
      {
        label: 'Memory Usage (%)',
        data: sortedMessages.map((msg) => msg.memory_usage),
        fill: true,
        tension: 0.4,
        borderColor: 'rgba(192, 75, 192, 1)',
        backgroundColor: 'rgba(192, 75, 192, 0.2)',
      },
    ],
  };

  // Disk и Network – без заливки и без сглаживания (при желании можно тоже включить)
  const diskData = {
    labels,
    datasets: [
      {
        label: 'Disk Usage (%)',
        data: sortedMessages.map((msg) => msg.disk_usage),
        fill: false,
        tension: 0, // нет сглаживания
        borderColor: 'rgba(192, 192, 75, 1)',
      },
    ],
  };
  const networkData = {
    labels,
    datasets: [
      {
        label: 'Network Usage (bytes)',
        data: sortedMessages.map((msg) => msg.network_usage),
        fill: false,
        tension: 0,
        borderColor: 'rgba(75, 75, 192, 1)',
      },
    ],
  };

  // Общие настройки графиков
  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div
      className="machine-monitor"
      style={{
        border: '1px solid #ccc',
        margin: '10px',
        padding: '10px',
      }}
    >
      <h2>
        Server: {serverId}{' '}
        <small style={{ fontWeight: 'normal' }}>[Tag: {tag}]</small>
      </h2>

      {/* Панель переключения отдельных графиков */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ marginRight: '10px' }}>
          <input
            type="checkbox"
            checked={showCpu}
            onChange={() => setShowCpu(!showCpu)}
          />{' '}
          CPU
        </label>
        <label style={{ marginRight: '10px' }}>
          <input
            type="checkbox"
            checked={showMemory}
            onChange={() => setShowMemory(!showMemory)}
          />{' '}
          Memory
        </label>
        <label style={{ marginRight: '10px' }}>
          <input
            type="checkbox"
            checked={showDisk}
            onChange={() => setShowDisk(!showDisk)}
          />{' '}
          Disk
        </label>
        <label style={{ marginRight: '10px' }}>
          <input
            type="checkbox"
            checked={showNetwork}
            onChange={() => setShowNetwork(!showNetwork)}
          />{' '}
          Network
        </label>
      </div>

      {/* Отображение графиков */}
      <div className="charts">
        {showCpu && (
          <div style={{ marginBottom: '20px' }}>
            <Line data={cpuData} options={options} />
          </div>
        )}
        {showMemory && (
          <div style={{ marginBottom: '20px' }}>
            <Line data={memoryData} options={options} />
          </div>
        )}
        {showDisk && (
          <div style={{ marginBottom: '20px' }}>
            <Line data={diskData} options={options} />
          </div>
        )}
        {showNetwork && (
          <div style={{ marginBottom: '20px' }}>
            <Line data={networkData} options={options} />
          </div>
        )}
      </div>
    </div>
  );
}
