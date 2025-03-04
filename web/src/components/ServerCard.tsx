import React, { useState } from 'react';
import { Cpu, HardDrive, Microchip, Network, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MetricMessage, ServerMetrics, MetricType } from '@/types/metrics';
import { formatPercentage, formatBytes } from '@/utils/formatters';
import { useMetrics } from '@/context/MetricsContext';
import MetricsChart from './MetricsChart';
import StatusIndicator from './StatusIndicator';

interface ServerCardProps {
  server: ServerMetrics;
  tag: string;
}

const ServerCard: React.FC<ServerCardProps> = ({ server, tag }) => {
  const [expandedMetrics, setExpandedMetrics] = useState<Set<MetricType>>(new Set());
  const { state, dispatch } = useMetrics();
  const { filters } = state;
  
  const metrics = server.tags[tag]?.current;
  const history = server.tags[tag]?.history || [];
  
  if (!metrics) {
    return null;
  }
  
  const toggleVisibility = () => {
    dispatch({
      type: 'SET_SERVER_VISIBILITY',
      payload: { serverId: server.server_id, isHidden: !server.isHidden }
    });
  };
  
  const toggleMetricExpanded = (metricType: MetricType) => {
    setExpandedMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metricType)) {
        newSet.delete(metricType);
      } else {
        newSet.add(metricType);
      }
      return newSet;
    });
  };

  // Toggle all metrics at once
  const toggleAllMetrics = () => {
    setExpandedMetrics(prev => {
      if (prev.size > 0) {
        // If any are expanded, collapse all
        return new Set();
      } else {
        // Expand all visible metrics
        const newSet = new Set<MetricType>();
        if (filters.showCpu) newSet.add('cpu_usage');
        if (filters.showMemory) newSet.add('memory_usage');
        if (filters.showDisk) newSet.add('disk_usage');
        if (filters.showNetwork) newSet.add('network_usage');
        return newSet;
      }
    });
  };

  // Check if all visible metrics are expanded
  const areAllMetricsExpanded = (): boolean => {
    let visibleMetricsCount = 0;
    
    if (filters.showCpu) visibleMetricsCount++;
    if (filters.showMemory) visibleMetricsCount++;
    if (filters.showDisk) visibleMetricsCount++;
    if (filters.showNetwork) visibleMetricsCount++;
    
    return expandedMetrics.size === visibleMetricsCount && visibleMetricsCount > 0;
  };
  
  return (
    <motion.div 
      className="glass-card card-hover-effect rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="metric-tag bg-primary/10 text-primary mr-2">
              {server.server_id}
            </span>
            <span className="metric-tag bg-accent/30 text-accent-foreground">
              {tag}
            </span>
          </div>
          <div className="flex items-center gap-2">
          <button 
              onClick={toggleAllMetrics}
              className="p-1 rounded-full hover:bg-muted/50 transition-colors"
              aria-label={areAllMetricsExpanded() ? "Collapse all metrics" : "Expand all metrics"}
              title={areAllMetricsExpanded() ? "Collapse all metrics" : "Expand all metrics"}
            >
              {areAllMetricsExpanded() ? (
                <ChevronUp size={16} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={16} className="text-muted-foreground" />
              )}
            </button>
            <button 
              onClick={toggleVisibility}
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
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          {filters.showCpu && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80">
              <Cpu size={18} className="text-metric-cpu" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">CPU</div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">
                    {formatPercentage(metrics.cpu_usage)}
                  </div>
                  <StatusIndicator value={metrics.cpu_usage} />
                </div>
              </div>
              <button 
                onClick={() => toggleMetricExpanded('cpu_usage')}
                className="p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                {expandedMetrics.has('cpu_usage') ? (
                  <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={16} className="text-muted-foreground" />
                )}
              </button>
            </div>
          )}
          
          {filters.showMemory && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80">
              <Microchip size={18} className="text-metric-memory" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Memory</div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">
                    {formatPercentage(metrics.memory_usage)}
                  </div>
                  <StatusIndicator value={metrics.memory_usage} />
                </div>
              </div>
              <button 
                onClick={() => toggleMetricExpanded('memory_usage')}
                className="p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                {expandedMetrics.has('memory_usage') ? (
                  <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={16} className="text-muted-foreground" />
                )}
              </button>
            </div>
          )}
          
          {filters.showDisk && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80">
              <HardDrive size={18} className="text-metric-disk" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Disk</div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">
                    {formatPercentage(metrics.disk_usage)}
                  </div>
                  <StatusIndicator value={metrics.disk_usage} />
                </div>
              </div>
              <button 
                onClick={() => toggleMetricExpanded('disk_usage')}
                className="p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                {expandedMetrics.has('disk_usage') ? (
                  <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={16} className="text-muted-foreground" />
                )}
              </button>
            </div>
          )}
          
          {filters.showNetwork && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80">
              <Network size={18} className="text-metric-network" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Network</div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">
                    {formatBytes(metrics.network_usage)}
                  </div>
                  <StatusIndicator value={metrics.network_usage > 1048576 ? 75 : (metrics.network_usage > 524288 ? 50 : 25)} />
                </div>
              </div>
              <button 
                onClick={() => toggleMetricExpanded('network_usage')}
                className="p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                {expandedMetrics.has('network_usage') ? (
                  <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={16} className="text-muted-foreground" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {expandedMetrics.size > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {(filters.showCpu && expandedMetrics.has('cpu_usage')) && (
                <MetricsChart 
                  history={history} 
                  metricType="cpu_usage"
                />
              )}
              
              {(filters.showMemory && expandedMetrics.has('memory_usage')) && (
                <MetricsChart 
                  history={history} 
                  metricType="memory_usage"
                />
              )}
              
              {(filters.showDisk && expandedMetrics.has('disk_usage')) && (
                <MetricsChart 
                  history={history} 
                  metricType="disk_usage"
                />
              )}
              
              {(filters.showNetwork && expandedMetrics.has('network_usage')) && (
                <MetricsChart 
                  history={history} 
                  metricType="network_usage"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ServerCard;