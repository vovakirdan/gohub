
export interface MetricMessage {
  message: string;
  server_id: string;
  tag: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_usage: number;
  timestamp: number;
}

export interface ServerMetrics {
  server_id: string;
  tags: {
    [tag: string]: {
      current: MetricMessage;
      history: MetricMessage[];
    };
  };
  isHidden?: boolean;
}

export type MetricType = 'cpu_usage' | 'memory_usage' | 'disk_usage' | 'network_usage';

export interface MetricsFilterState {
  showCpu: boolean;
  showMemory: boolean;
  showDisk: boolean;
  showNetwork: boolean;
  viewMode: 'grid' | 'list';
}