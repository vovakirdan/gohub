import React from 'react';
import { MetricsProvider } from '@/context/MetricsContext';
import { useMetricsData } from '@/hooks/useMetricsData';
import MetricsHeader from '@/components/MetricsHeader';
import ServerGrid from '@/components/ServerGrid';
import ServerList from '@/components/ServerList';
import { motion } from 'framer-motion';

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
  const { filters, visibleServers, isConnected, isLoading, serversInitialized } = useMetricsData();
  // For demonstration, create some mock data if no servers are connected yet
  const serversToDisplay = (visibleServers.length > 0 || isLoading || !serversInitialized) 
    ? visibleServers 
    : [
        {
          server_id: "server-001",
          tags: {
            "production": {
              current: { ...mockMetricData, timestamp: Date.now() },
              history: Array.from({ length: 20 }, (_, i) => ({
                ...mockMetricData,
                cpu_usage: Math.random() * 100,
                memory_usage: Math.random() * 100,
                disk_usage: Math.random() * 100,
                network_usage: Math.random() * 1048576, // Random network usage in bytes
                timestamp: Date.now() - (19 - i) * 60000
              }))
            }
          }
        },
        {
          server_id: "server-002",
          tags: {
            "staging": {
              current: { 
                ...mockMetricData, 
                server_id: "server-002", 
                tag: "staging",
                cpu_usage: 22,
                memory_usage: 35,
                network_usage: 524288, // 512KB in bytes
                timestamp: Date.now() 
              },
              history: Array.from({ length: 20 }, (_, i) => ({
                ...mockMetricData,
                server_id: "server-002",
                tag: "staging",
                cpu_usage: Math.random() * 100,
                memory_usage: Math.random() * 100,
                disk_usage: Math.random() * 100,
                network_usage: Math.random() * 524288, // Random network usage in bytes
                timestamp: Date.now() - (19 - i) * 60000
              }))
            }
          }
        },
        {
          server_id: "server-003",
          tags: {
            "development": {
              current: { 
                ...mockMetricData, 
                server_id: "server-003", 
                tag: "development",
                cpu_usage: 12,
                memory_usage: 48,
                disk_usage: 33,
                network_usage: 262144, // 256KB in bytes
                timestamp: Date.now() 
              },
              history: Array.from({ length: 20 }, (_, i) => ({
                ...mockMetricData,
                server_id: "server-003",
                tag: "development",
                cpu_usage: Math.random() * 100,
                memory_usage: Math.random() * 100,
                disk_usage: Math.random() * 100,
                network_usage: Math.random() * 262144, // Random network usage in bytes
                timestamp: Date.now() - (19 - i) * 60000
              }))
            }
          }
        }
      ];
  
  return (
    <div className="container py-8">
      <div className="max-w-7xl mx-auto">
        <MetricsHeader />
        
        {isLoading && (
          <motion.div 
            className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl shadow-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse mr-2"></div>
              <p className="text-sm text-blue-800">
                Loading server information...
              </p>
            </div>
          </motion.div>
        )}
        
        {!isConnected && !isLoading && (
          <motion.div 
            className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl shadow-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse mr-2"></div>
              <p className="text-sm text-yellow-800">
                WebSocket connection not established. {serversInitialized ? "Showing server list without live data." : "Showing demo data."} Attempting to reconnect...
              </p>
            </div>
          </motion.div>
        )}
        
        <div className="view-transition">
          {filters.viewMode === 'grid' ? (
            <ServerGrid servers={serversToDisplay} />
          ) : (
            <ServerList servers={serversToDisplay} />
          )}
        </div>
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