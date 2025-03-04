import React, { useState } from 'react';
import { MetricsProvider } from '@/context/MetricsContext';
import { useMetricsData } from '@/hooks/useMetricsData';
import MetricsHeader from '@/components/MetricsHeader';
import ServerGrid from '@/components/ServerGrid';
import ServerList from '@/components/ServerList';
import { motion } from 'framer-motion';
import { ServerMetrics } from '@/types/metrics';

// Mock data for demonstration
const mockMetricData = {
  message: "Metric data received",
  server_id: "server-001",
  tag: "production",
  cpu_usage: 45,
  memory_usage: 62,
  disk_usage: 78,
  network_usage: 25,
  timestamp: Date.now(),
};

// Wrapper component that uses the context
const MetricsDashboard: React.FC = () => {
  const { filters, visibleServers, isConnected, isLoading } = useMetricsData();
  const [hiddenServerIds, setHiddenServerIds] = useState<Set<string>>(new Set());
  
  return (
    <div className="container py-8">
      <div className="max-w-7xl mx-auto">
        <MetricsHeader />
        
        {!isConnected && (
          <motion.div 
            className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl shadow-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse mr-2"></div>
              <p className="text-sm text-yellow-800">
                WebSocket connection not established. Attempting to reconnect...
              </p>
            </div>
          </motion.div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
            <span className="ml-3 text-muted-foreground">Loading server data...</span>
          </div>
        ) : visibleServers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No servers available. Please check your connection.</p>
          </div>
        ) : (
          <div className="view-transition">
            {filters.viewMode === 'grid' ? (
              <ServerGrid servers={visibleServers} />
            ) : (
              <ServerList servers={visibleServers} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// The main page that sets up the context
const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <MetricsProvider>
        <MetricsDashboard />
      </MetricsProvider>
    </div>
  );
};

export default Index;