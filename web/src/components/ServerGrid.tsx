import React from 'react';
import { ServerMetrics } from '@/types/metrics';
import ServerCard from './ServerCard';
import { motion } from 'framer-motion';
import { useMetrics } from '@/context/MetricsContext';
import { EyeOff } from 'lucide-react';

interface ServerGridProps {
  servers: ServerMetrics[];
}

const ServerGrid: React.FC<ServerGridProps> = ({ servers }) => {
  const { state, dispatch } = useMetrics();
  const hiddenServers = Object.values(state.servers).filter(server => server.isHidden);
  
  if (servers.length === 0 && hiddenServers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No servers to display</p>
      </div>
    );
  }

  const toggleServerVisibility = (serverId: string) => {
    dispatch({
      type: 'SET_SERVER_VISIBILITY',
      payload: { serverId, isHidden: false }
    });
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers.map(server => (
          Object.keys(server.tags).map(tag => (
            <ServerCard 
              key={`${server.server_id}-${tag}`}
              server={server}
              tag={tag}
            />
          ))
        ))}
      </div>
      
      {hiddenServers.length > 0 && (
        <div className="p-4 bg-muted/10 rounded-xl mt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Hidden servers:</h3>
          <div className="flex flex-wrap gap-2">
            {hiddenServers.map(server => (
              Object.keys(server.tags).map(tag => (
                <button
                  key={`${server.server_id}-${tag}`}
                  onClick={() => toggleServerVisibility(server.server_id)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-md text-xs hover:bg-muted/50 transition-colors"
                >
                  {server.server_id} ({tag})
                  <EyeOff size={12} className="text-muted-foreground" />
                </button>
              ))
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ServerGrid;