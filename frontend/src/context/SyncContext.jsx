/**
 * SyncContext
 * Starts/stops the WebSocket real-time sync bridge on auth state changes.
 * Also provides sync status indicators to any component in the tree.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { startSync, stopSync } from '../utils/sync-client';

const SyncContext = createContext({ isConnected: false });

export const useSyncStatus = () => useContext(SyncContext);

export const SyncProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user?.token) {
      startSync(user.token);
      // Optimistically mark as connected after short delay
      const t = setTimeout(() => setIsConnected(true), 800);
      return () => {
        clearTimeout(t);
        setIsConnected(false);
        stopSync();
      };
    } else {
      stopSync();
      setIsConnected(false);
    }
  }, [user?.token]);

  return (
    <SyncContext.Provider value={{ isConnected }}>
      {children}
    </SyncContext.Provider>
  );
};
