import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useOnlineGame(roomId, name) {
  const socketRef = useRef(null);
  const [room, setRoom] = useState(null); // { game, players }
  const [color, setColor] = useState(null); // 'r' | 'b' | null (đang xem)
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const socket = io(); // cùng origin, Vite proxy /socket.io sang server
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { roomId, name }, (res) => (res.ok ? setColor(res.color) : setError(res.error)));
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', setRoom);
    socket.on('color', setColor);
    return () => {
      socket.emit('leave');
      socket.disconnect();
    };
  }, [roomId, name]);

  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => setError(''), 3000);
    return () => clearTimeout(t);
  }, [error]);

  const ack = (res) => !res.ok && setError(res.error);
  const move = useCallback((m) => socketRef.current?.emit('move', m, ack), []);
  const resign = useCallback(() => socketRef.current?.emit('resign'), []);
  const rematch = useCallback(() => socketRef.current?.emit('rematch'), []);

  return { room, color, connected, error, move, resign, rematch };
}
