import React from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';

const SyncIndicator: React.FC = () => {
  const { state } = useAppContext();
  const { syncing, lastSyncTime } = state;

  if (syncing) {
    return (
      <div className="sync-indicator syncing">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (lastSyncTime) {
    return (
      <div className="sync-indicator synced">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span>Last sync: {lastSyncTime.toLocaleTimeString()}</span>
      </div>
    );
  }

  return (
    <div className="sync-indicator error">
      <AlertCircle className="w-4 h-4 text-yellow-500" />
      <span>Not synced</span>
    </div>
  );
};

export default SyncIndicator;