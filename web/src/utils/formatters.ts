
/**
 * Formats a usage value (0-100) as a percentage string
 */
export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

/**
 * Formats a timestamp as a human-readable time string
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/**
 * Formats bytes to a human-readable format (KB, MB, GB)
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Gets a user-friendly label for a metric type
 */
export const getMetricLabel = (metricType: string): string => {
  const labels: Record<string, string> = {
    cpu_usage: 'CPU',
    memory_usage: 'Memory',
    disk_usage: 'Disk',
    network_usage: 'Network'
  };
  
  return labels[metricType] || metricType;
};

/**
 * Returns a color for a specific metric type
 */
export const getMetricColor = (metricType: string): string => {
  const colors: Record<string, string> = {
    cpu_usage: 'rgb(14, 165, 233)', // metric.cpu
    memory_usage: 'rgb(139, 92, 246)', // metric.memory
    disk_usage: 'rgb(249, 115, 22)', // metric.disk
    network_usage: 'rgb(16, 185, 129)' // metric.network
  };
  
  return colors[metricType] || '#64748b';
};

/**
 * Creates a unique identifier for a server and tag combination
 */
export const createServerTagId = (serverId: string, tag: string): string => {
  return `${serverId}-${tag}`;
};