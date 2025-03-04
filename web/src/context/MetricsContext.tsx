import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MetricMessage, ServerMetrics, MetricsFilterState, MetricType } from '@/types/metrics';

// Define context state
interface MetricsState {
  servers: Record<string, ServerMetrics>;
  filters: MetricsFilterState;
  isLoading: boolean;
}

// Define action types
type MetricsAction =
  | { type: 'ADD_METRIC_DATA'; payload: MetricMessage }
  | { type: 'SET_SERVER_VISIBILITY'; payload: { serverId: string; isHidden: boolean } }
  | { type: 'TOGGLE_METRIC_FILTER'; payload: { metricType: MetricType } }
  | { type: 'SET_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_METRIC_HISTORY'; payload: { serverId: string; tag: string; history: MetricMessage[] } };

// Initial state
const initialState: MetricsState = {
  servers: {},
  filters: {
    showCpu: true,
    showMemory: true,
    showDisk: true,
    showNetwork: true,
    viewMode: 'grid'
  },
  isLoading: false
};

// Create the context
const MetricsContext = createContext<{
  state: MetricsState;
  dispatch: React.Dispatch<MetricsAction>;
} | undefined>(undefined);

// Reducer function
function metricsReducer(state: MetricsState, action: MetricsAction): MetricsState {
  switch (action.type) {
    case 'ADD_METRIC_DATA': {
      const { server_id, tag, ...metricData } = action.payload;
      
      // Create a copy of the current server state
      const currentServer = state.servers[server_id] || {
        server_id,
        tags: {},
        isHidden: false
      };
      
      // Create a copy of the tags
      const currentTags = { ...currentServer.tags };
      
      // Create or update the tag's metrics
      currentTags[tag] = {
        current: action.payload,
        history: [
          ...(currentTags[tag]?.history || []).slice(-19), // Keep last 19 items
          action.payload // Add new item
        ]
      };
      
      // Return updated state
      return {
        ...state,
        servers: {
          ...state.servers,
          [server_id]: {
            ...currentServer,
            tags: currentTags
          }
        }
      };
    }
      
    case 'SET_SERVER_VISIBILITY': {
      const { serverId, isHidden } = action.payload;
      
      if (!state.servers[serverId]) {
        return state;
      }
      
      return {
        ...state,
        servers: {
          ...state.servers,
          [serverId]: {
            ...state.servers[serverId],
            isHidden
          }
        }
      };
    }
      
    case 'TOGGLE_METRIC_FILTER': {
      const { metricType } = action.payload;
      const filterProperty = `show${metricType.split('_')[0].charAt(0).toUpperCase() + metricType.split('_')[0].slice(1)}` as keyof Omit<MetricsFilterState, 'viewMode'>;
      
      return {
        ...state,
        filters: {
          ...state.filters,
          [filterProperty]: !state.filters[filterProperty]
        }
      };
    }
      
    case 'SET_VIEW_MODE': {
      return {
        ...state,
        filters: {
          ...state.filters,
          viewMode: action.payload
        }
      };
    }
      
    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload
      };
    }
      
    case 'SET_METRIC_HISTORY': {
      const { serverId, tag, history } = action.payload;
      
      if (!state.servers[serverId] || !state.servers[serverId].tags[tag]) {
        return state;
      }
      
      const updatedServer = {
        ...state.servers[serverId],
        tags: {
          ...state.servers[serverId].tags,
          [tag]: {
            ...state.servers[serverId].tags[tag],
            history
          }
        }
      };
      
      return {
        ...state,
        servers: {
          ...state.servers,
          [serverId]: updatedServer
        }
      };
    }
      
    default:
      return state;
  }
}

// Provider component
export const MetricsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(metricsReducer, initialState);
  
  return (
    <MetricsContext.Provider value={{ state, dispatch }}>
      {children}
    </MetricsContext.Provider>
  );
};

// Custom hook to use the metrics context
export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (context === undefined) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
};