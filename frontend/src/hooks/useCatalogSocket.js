'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

/**
 * Manages a single Socket.IO connection for the Bidder Auction Catalog.
 * - Joins rooms ONLY for active (LIVE / SCHEDULED) auctions where real-time updates matter.
 * - Dynamically leaves rooms when auctions close or disappear from the catalog.
 * - Tracks per-auction version numbers externally via callbacks to prevent stale overwrites.
 * - Cleans up all listeners, room memberships, and socket connection on unmount.
 */
export function useCatalogSocket({
  activeAuctionIds = [],
  enabled = true,
  onAuctionUpdate,
  onAuctionClosed,
  onReconnectSync,
}) {
  const [connectionStatus, setConnectionStatus] = useState(
    enabled ? 'connecting' : 'idle'
  );

  const socketRef = useRef(null);
  const joinedRoomsRef = useRef(new Set());
  const callbacksRef = useRef({
    onAuctionUpdate,
    onAuctionClosed,
    onReconnectSync,
  });

  useEffect(() => {
    callbacksRef.current = {
      onAuctionUpdate,
      onAuctionClosed,
      onReconnectSync,
    };
  }, [onAuctionUpdate, onAuctionClosed, onReconnectSync]);

  // Stable sorted key of active auction IDs so room diffing only runs on real membership changes
  const activeIdsKey = useMemo(() => {
    const unique = Array.from(new Set(activeAuctionIds.filter(Boolean))).sort();
    return unique.join(',');
  }, [activeAuctionIds]);

  const activeIdsList = useMemo(
    () => (activeIdsKey ? activeIdsKey.split(',') : []),
    [activeIdsKey]
  );

  // Establish Socket.IO connection only when enabled and there are active auctions to monitor
  const shouldConnect = enabled && activeIdsList.length > 0;

  useEffect(() => {
    if (!shouldConnect) {
      setConnectionStatus('idle');
      return undefined;
    }

    let hasConnectedOnce = false;
    setConnectionStatus('connecting');

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    const joinAllCurrent = () => {
      const targetIds = Array.from(joinedRoomsRef.current);
      targetIds.forEach((auctionId) => {
        socket.emit('auction:join', { auctionId });
      });
    };

    const handleConnect = () => {
      setConnectionStatus('connected');
      joinAllCurrent();

      if (hasConnectedOnce && callbacksRef.current.onReconnectSync) {
        callbacksRef.current.onReconnectSync();
      }
      hasConnectedOnce = true;
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    const handleReconnectError = () => {
      setConnectionStatus('reconnecting');
    };

    const handleAuctionUpdate = (payload) => {
      if (callbacksRef.current.onAuctionUpdate) {
        callbacksRef.current.onAuctionUpdate(payload);
      }
    };

    const handleAuctionClosed = (payload) => {
      if (callbacksRef.current.onAuctionClosed) {
        callbacksRef.current.onAuctionClosed(payload);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('auction:update', handleAuctionUpdate);
    socket.on('auction:closed', handleAuctionClosed);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    socket.io.on('reconnect_error', handleReconnectError);

    return () => {
      if (socket.connected) {
        joinedRoomsRef.current.forEach((auctionId) => {
          socket.emit('auction:leave', { auctionId });
        });
      }
      joinedRoomsRef.current.clear();
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('auction:update', handleAuctionUpdate);
      socket.off('auction:closed', handleAuctionClosed);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.io.off('reconnect_error', handleReconnectError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [shouldConnect]);

  // Reconcile room memberships whenever the list of active (LIVE/SCHEDULED) auctions changes
  useEffect(() => {
    const nextSet = new Set(activeIdsList);
    const prevSet = joinedRoomsRef.current;
    const socket = socketRef.current;

    if (socket && socket.connected) {
      prevSet.forEach((id) => {
        if (!nextSet.has(id)) {
          socket.emit('auction:leave', { auctionId: id });
        }
      });
      nextSet.forEach((id) => {
        if (!prevSet.has(id)) {
          socket.emit('auction:join', { auctionId: id });
        }
      });
    }

    joinedRoomsRef.current = nextSet;
  }, [activeIdsList]);

  return { connectionStatus };
}
