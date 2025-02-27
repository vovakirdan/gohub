export type MetricMessage = {
    message: string;
    server_id: string;
    tag: string;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_usage: number;
    timestamp: number;
  };
  