import { useCallback, useEffect } from 'react';
import { useMetrics } from '@/context/MetricsContext';
import { MetricMessage } from '@/types/metrics';
import { useWebSocket } from './useWebSocket';
import { toast } from 'sonner';

// Mock WebSocket URL - replace with actual URL in production
const WS_URL = 'ws://localhost:8080/metrics';

export function useMetricsData() {
  const { state, dispatch } = useMetrics();
  
  // Handle incoming metric data
  const handleMetricData = useCallback((data: MetricMessage) => {
    dispatch({ type: 'ADD_METRIC_DATA', payload: data });
  }, [dispatch]);
  
  // Connect to WebSocket
  const { isConnected } = useWebSocket({
    url: WS_URL,
    onMessage: handleMetricData
  });
  
  // Fetch historical data for a server & tag
  const fetchServerHistory = useCallback(async (serverId: string, tag: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Replace with actual API endpoint in production
      const response = await fetch(`/api/metrics/history?server_id=${serverId}&tag=${tag}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      
      const historyData = await response.json() as MetricMessage[];
      
      dispatch({
        type: 'SET_METRIC_HISTORY',
        payload: { serverId, tag, history: historyData }
      });
      
    } catch (error) {
      console.error('Error fetching server history:', error);
      toast.error('Failed to load historical metrics data');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);
  
  // Toggle server visibility
  const toggleServerVisibility = useCallback((serverId: string) => {
    const server = state.servers[serverId];
    if (server) {
      dispatch({
        type: 'SET_SERVER_VISIBILITY',
        payload: { serverId, isHidden: !server.isHidden }
      });
    }
  }, [state.servers, dispatch]);
  
  // Toggle metric filter
  const toggleMetricFilter = useCallback((metricType: 'cpu_usage' | 'memory_usage' | 'disk_usage' | 'network_usage') => {
    dispatch({
      type: 'TOGGLE_METRIC_FILTER',
      payload: { metricType }
    });
  }, [dispatch]);
  
  // Set view mode
  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    dispatch({
      type: 'SET_VIEW_MODE',
      payload: mode
    });
  }, [dispatch]);
  
  // Get visible servers
  const getVisibleServers = useCallback(() => {
    return Object.values(state.servers).filter(server => !server.isHidden);
  }, [state.servers]);
  
  return {
    isConnected,
    servers: state.servers,
    filters: state.filters,
    isLoading: state.isLoading,
    visibleServers: getVisibleServers(),
    fetchServerHistory,
    toggleServerVisibility,
    toggleMetricFilter,
    setViewMode
  };
}