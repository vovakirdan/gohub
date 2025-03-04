import React from 'react';
import { ServerMetrics, MetricType } from '@/types/metrics';
import { Cpu, HardDrive, Microchip, Network, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { formatPercentage } from '@/utils/formatters';
import { useMetrics } from '@/context/MetricsContext';
import { motion, AnimatePresence } from 'framer-motion';
import MetricsChart from './MetricsChart';
import StatusIndicator from './StatusIndicator';

interface ServerListProps {
  servers: ServerMetrics[];
}

const ServerList: React.FC<ServerListProps> = ({ servers }) => {
  const { state, dispatch } = useMetrics();
  const { filters } = state;
  const [expandedItems, setExpandedItems] = React.useState<Map<string, Set<MetricType>>>(new Map());
  
  if (servers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No servers to display</p>
      </div>
    );
  }
  
  const toggleVisibility = (serverId: string) => {
    dispatch({
      type: 'SET_SERVER_VISIBILITY',
      payload: { 
        serverId, 
        isHidden: !servers.find(s => s.server_id === serverId)?.isHidden 
      }
    });
  };
  
  const toggleExpandedMetric = (rowKey: string, metricType: MetricType) => {
    setExpandedItems(prev => {
      const newMap = new Map(prev);
      
      if (!newMap.has(rowKey)) {
        newMap.set(rowKey, new Set([metricType]));
      } else {
        const metrics = newMap.get(rowKey)!;
        if (metrics.has(metricType)) {
          metrics.delete(metricType);
          if (metrics.size === 0) {
            newMap.delete(rowKey);
          }
        } else {
          metrics.add(metricType);
        }
      }
      
      return newMap;
    });
  };
  
  const isMetricExpanded = (rowKey: string, metricType: MetricType): boolean => {
    return expandedItems.has(rowKey) && expandedItems.get(rowKey)!.has(metricType);
  };

  // New: Toggle all metrics in a row
  const toggleAllMetrics = (rowKey: string, server: ServerMetrics) => {
    setExpandedItems(prev => {
      const newMap = new Map(prev);
      const hasExpandedMetrics = prev.has(rowKey) && prev.get(rowKey)!.size > 0;
      
      if (hasExpandedMetrics) {
        // If any metrics are expanded, collapse all
        newMap.delete(rowKey);
      } else {
        // Expand all visible metrics
        const metricsToExpand = new Set<MetricType>();
        if (filters.showCpu) metricsToExpand.add('cpu_usage');
        if (filters.showMemory) metricsToExpand.add('memory_usage');
        if (filters.showDisk) metricsToExpand.add('disk_usage');
        if (filters.showNetwork) metricsToExpand.add('network_usage');
        
        newMap.set(rowKey, metricsToExpand);
      }
      
      return newMap;
    });
  };

  // Check if all visible metrics are expanded for a row
  const areAllMetricsExpanded = (rowKey: string): boolean => {
    if (!expandedItems.has(rowKey)) return false;
    
    const expandedSet = expandedItems.get(rowKey)!;
    let visibleMetricsCount = 0;
    
    if (filters.showCpu) visibleMetricsCount++;
    if (filters.showMemory) visibleMetricsCount++;
    if (filters.showDisk) visibleMetricsCount++;
    if (filters.showNetwork) visibleMetricsCount++;
    
    return expandedSet.size === visibleMetricsCount;
  };

  return (
    <motion.div 
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white/70 backdrop-blur-md rounded-xl overflow-hidden border shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Server / Tag</th>
              {filters.showCpu && (
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Cpu size={14} className="text-metric-cpu" />
                    <span>CPU</span>
                  </div>
                </th>
              )}
              {filters.showMemory && (
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Microchip size={14} className="text-metric-memory" />
                    <span>Memory</span>
                  </div>
                </th>
              )}
              {filters.showDisk && (
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <HardDrive size={14} className="text-metric-disk" />
                    <span>Disk</span>
                  </div>
                </th>
              )}
              {filters.showNetwork && (
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Network size={14} className="text-metric-network" />
                    <span>Network</span>
                  </div>
                </th>
              )}
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {servers.map(server => (
              Object.keys(server.tags).map(tag => {
                const metrics = server.tags[tag]?.current;
                const history = server.tags[tag]?.history || [];
                const rowKey = `${server.server_id}-${tag}`;
                
                if (!metrics) return null;
                
                return (
                  <React.Fragment key={rowKey}>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="metric-tag bg-primary/10 text-primary inline-block mb-1 w-max">
                            {server.server_id}
                          </span>
                          <span className="metric-tag bg-accent/30 text-accent-foreground inline-block w-max">
                            {tag}
                          </span>
                        </div>
                      </td>
                      
                      {filters.showCpu && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <div>{formatPercentage(metrics.cpu_usage)}</div>
                              <StatusIndicator value={metrics.cpu_usage} />
                            </div>
                            <button 
                              onClick={() => toggleExpandedMetric(rowKey, 'cpu_usage')}
                              className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                            >
                              {isMetricExpanded(rowKey, 'cpu_usage') ? (
                                <ChevronUp size={16} className="text-muted-foreground" />
                              ) : (
                                <ChevronDown size={16} className="text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          <AnimatePresence>
                            {isMetricExpanded(rowKey, 'cpu_usage') && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden mt-2"
                              >
                                <MetricsChart 
                                  history={history} 
                                  metricType="cpu_usage"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      )}
                      
                      {filters.showMemory && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <div>{formatPercentage(metrics.memory_usage)}</div>
                              <StatusIndicator value={metrics.memory_usage} />
                            </div>
                            <button 
                              onClick={() => toggleExpandedMetric(rowKey, 'memory_usage')}
                              className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                            >
                              {isMetricExpanded(rowKey, 'memory_usage') ? (
                                <ChevronUp size={16} className="text-muted-foreground" />
                              ) : (
                                <ChevronDown size={16} className="text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          <AnimatePresence>
                            {isMetricExpanded(rowKey, 'memory_usage') && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden mt-2"
                              >
                                <MetricsChart 
                                  history={history} 
                                  metricType="memory_usage"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      )}
                      
                      {filters.showDisk && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <div>{formatPercentage(metrics.disk_usage)}</div>
                              <StatusIndicator value={metrics.disk_usage} />
                            </div>
                            <button 
                              onClick={() => toggleExpandedMetric(rowKey, 'disk_usage')}
                              className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                            >
                              {isMetricExpanded(rowKey, 'disk_usage') ? (
                                <ChevronUp size={16} className="text-muted-foreground" />
                              ) : (
                                <ChevronDown size={16} className="text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          <AnimatePresence>
                            {isMetricExpanded(rowKey, 'disk_usage') && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden mt-2"
                              >
                                <MetricsChart 
                                  history={history} 
                                  metricType="disk_usage"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      )}
                      
                      {filters.showNetwork && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <div>{formatPercentage(metrics.network_usage)}</div>
                              <StatusIndicator value={metrics.network_usage} />
                            </div>
                            <button 
                              onClick={() => toggleExpandedMetric(rowKey, 'network_usage')}
                              className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                            >
                              {isMetricExpanded(rowKey, 'network_usage') ? (
                                <ChevronUp size={16} className="text-muted-foreground" />
                              ) : (
                                <ChevronDown size={16} className="text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          <AnimatePresence>
                            {isMetricExpanded(rowKey, 'network_usage') && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden mt-2"
                              >
                                <MetricsChart 
                                  history={history} 
                                  metricType="network_usage"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      )}
                      
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => toggleAllMetrics(rowKey, server)}
                            className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                            aria-label={areAllMetricsExpanded(rowKey) ? "Collapse all metrics" : "Expand all metrics"}
                            title={areAllMetricsExpanded(rowKey) ? "Collapse all metrics" : "Expand all metrics"}
                          >
                            {areAllMetricsExpanded(rowKey) ? (
                              <ChevronUp size={16} className="text-muted-foreground" />
                            ) : (
                              <ChevronDown size={16} className="text-muted-foreground" />
                            )}
                          </button>
                          <button 
                            onClick={() => toggleVisibility(server.server_id)}
                            className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                            aria-label={server.isHidden ? "Show server" : "Hide server"}
                          >
                            {server.isHidden ? (
                              <EyeOff size={16} className="text-muted-foreground" />
                            ) : (
                              <Eye size={16} className="text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default ServerList;