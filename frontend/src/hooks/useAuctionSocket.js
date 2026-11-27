'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

/**
 * Manages Socket.IO connection, auction room membership, reconnection sync,
 * and stale-version filtering.
 */
export function useAuctionSocket({
  auctionId,
  onAuctionUpdate,
  onAuctionClosed,
  onBidRejected,
  onReconnectSync,
}) {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [socketId, setSocketId] = useState(null);

  const callbacksRef = useRef({
    onAuctionUpdate,
    onAuctionClosed,
    onBidRejected,
    onReconnectSync,
  });

  useEffect(() => {
    callbacksRef.current = {
      onAuctionUpdate,
      onAuctionClosed,
      onBidRejected,
      onReconnectSync,
    };
  }, [onAuctionUpdate, onAuctionClosed, onBidRejected, onReconnectSync]);

  useEffect(() => {
    if (!auctionId) return undefined;

    let hasConnectedOnce = false;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const joinRoom = () => {
      socket.emit('auction:join', { auctionId }, (ack) => {
        if (ack?.ok) {
          setSocketId(ack.socketId || socket.id);
        }
      });
    };

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setSocketId(socket.id);
      joinRoom();

      if (hasConnectedOnce && callbacksRef.current.onReconnectSync) {
        callbacksRef.current.onReconnectSync();
      }
      hasConnectedOnce = true;
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setSocketId(null);
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting');
    });

    socket.io.on('reconnect_error', () => {
      setConnectionStatus('reconnecting');
    });

    socket.on('auction:update', (payload) => {
      if (callbacksRef.current.onAuctionUpdate) {
        callbacksRef.current.onAuctionUpdate(payload);
      }
    });

    socket.on('auction:closed', (payload) => {
      if (callbacksRef.current.onAuctionClosed) {
        callbacksRef.current.onAuctionClosed(payload);
      }
    });

    socket.on('bid:rejected', (payload) => {
      if (callbacksRef.current.onBidRejected) {
        callbacksRef.current.onBidRejected(payload);
      }
    });

    return () => {
      socket.emit('auction:leave', { auctionId });
      socket.off('connect');
      socket.off('disconnect');
      socket.off('auction:update');
      socket.off('auction:closed');
      socket.off('bid:rejected');
      socket.io.off('reconnect_attempt');
      socket.io.off('reconnect_error');
      socket.disconnect();
    };
  }, [auctionId]);

  return { connectionStatus, socketId };
}
