'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  type: string;
  message: string;
  data: any;
  timestamp: Date;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

    socketRef.current = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));

    socketRef.current.on('notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const clearNotifications = () => setNotifications([]);

  return { notifications, connected, clearNotifications };
}