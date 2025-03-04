import React from 'react';
import { ServerMetrics } from '@/types/metrics';
import ServerCard from './ServerCard';
import { motion } from 'framer-motion';

interface ServerGridProps {
  servers: ServerMetrics[];
}

const ServerGrid: React.FC<ServerGridProps> = ({ servers }) => {
  if (servers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No servers to display</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {servers.map(server => (
        Object.keys(server.tags).map(tag => (
          <ServerCard 
            key={`${server.server_id}-${tag}`}
            server={server}
            tag={tag}
          />
        ))
      ))}
    </motion.div>
  );
};

export default ServerGrid;