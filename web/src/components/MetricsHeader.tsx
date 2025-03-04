import React from 'react';
import { Cpu, HardDrive, Network, LayoutGrid, List, Microchip } from 'lucide-react';
import { useMetrics } from '@/context/MetricsContext';

const MetricsHeader: React.FC = () => {
  const { state, dispatch } = useMetrics();
  const { filters } = state;
  
  const toggleMetricFilter = (metricType: 'cpu_usage' | 'memory_usage' | 'disk_usage' | 'network_usage') => {
    dispatch({
      type: 'TOGGLE_METRIC_FILTER',
      payload: { metricType }
    });
  };
  
  const setViewMode = (mode: 'grid' | 'list') => {
    dispatch({
      type: 'SET_VIEW_MODE',
      payload: mode
    });
  };
  
  return (
    <div className="flex justify-between items-center p-4 bg-white/70 backdrop-blur-md rounded-xl border shadow-sm mb-6">
      <div className="text-xl font-medium">Metrics Hub</div>
      
      <div className="flex items-center space-x-1">
        <div className="bg-muted/30 rounded-lg p-1 mr-4">
          <button 
            onClick={() => toggleMetricFilter('cpu_usage')}
            className={`p-2 rounded-md transition-colors ${filters.showCpu ? 'bg-white shadow-sm text-metric-cpu' : 'text-muted-foreground hover:bg-muted/50'}`}
            aria-label="Toggle CPU metrics"
          >
            <Cpu size={18} />
          </button>
          <button 
            onClick={() => toggleMetricFilter('memory_usage')}
            className={`p-2 rounded-md transition-colors ${filters.showMemory ? 'bg-white shadow-sm text-metric-memory' : 'text-muted-foreground hover:bg-muted/50'}`}
            aria-label="Toggle Memory metrics"
          >
            <Microchip size={18} />
          </button>
          <button 
            onClick={() => toggleMetricFilter('disk_usage')}
            className={`p-2 rounded-md transition-colors ${filters.showDisk ? 'bg-white shadow-sm text-metric-disk' : 'text-muted-foreground hover:bg-muted/50'}`}
            aria-label="Toggle Disk metrics"
          >
            <HardDrive size={18} />
          </button>
          <button 
            onClick={() => toggleMetricFilter('network_usage')}
            className={`p-2 rounded-md transition-colors ${filters.showNetwork ? 'bg-white shadow-sm text-metric-network' : 'text-muted-foreground hover:bg-muted/50'}`}
            aria-label="Toggle Network metrics"
          >
            <Network size={18} />
          </button>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-1">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${filters.viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
            aria-label="Grid view"
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${filters.viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
            aria-label="List view"
          >
            <List size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetricsHeader;