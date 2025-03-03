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

export type ServerRow = {
  ServerID: string;
  Tag: string;
};

export type MetricRow = {
  ID: string; // or number, depending on your data
  ServerID: string;
  Tag: string;
  CPUUsage: number;
  MemoryUsage: number;
  DiskUsage: number;
  NetworkUsage: number;
  CreatedAt: string; // Assuming this is an ISO8601 string
};
  