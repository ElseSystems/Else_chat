'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, getToken, getUser, canFilterMessage } from './realtime-helpers';

export function useSocket(handlers: {
  onMessage?: (data: any) => void;
  onConversation?: (data: any) => void;
  onInstance?: (data: any) => void;
  onQr?: (data: any) => void;
}) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('message.created', (data) => {
      const user = getUser();
      if (user && data.visibility && !canFilterMessage(user, data.visibility)) {
        return;
      }
      handlersRef.current.onMessage?.(data);
    });
    socket.on('conversation.updated', (data) => {
      handlersRef.current.onConversation?.(data);
    });
    socket.on('instance.updated', (data) => {
      handlersRef.current.onInstance?.(data);
    });
    socket.on('instance.qr', (data) => {
      handlersRef.current.onQr?.(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
}
