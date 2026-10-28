// Server phòng chơi online. Server giữ thế cờ và tự kiểm tra mọi nước đi bằng luật dùng chung,
// client chỉ gửi {from, to} rồi vẽ lại theo trạng thái server phát xuống.
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { BLACK, RED, applyMove, createGame, resign } from '@xq/shared';

// Không dùng biến PORT chung để khỏi đụng cổng của Vite (5173) khi chạy cùng lúc.
const PORT = Number(process.env.XQ_SERVER_PORT) || 3001;
const ROOM_ID = /^[a-z0-9-]{1,24}$/;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Xiangqi server đang chạy');
});
const io = new Server(httpServer, { cors: { origin: true } });

// roomId -> { game, seats: { r: {id, name} | null, b: ... } }
const rooms = new Map();

function roomState(room) {
  return {
    game: room.game,
    players: { r: room.seats.r?.name ?? null, b: room.seats.b?.name ?? null },
  };
}

function broadcast(roomId) {
  const room = rooms.get(roomId);
  if (room) io.to(roomId).emit('state', roomState(room));
}

function leaveRoom(socket) {
  const { roomId, color } = socket.data;
  if (!roomId) return;
  socket.leave(roomId);
  const room = rooms.get(roomId);
  socket.data = {};
  if (!room) return;
  if (color && room.seats[color]?.id === socket.id) room.seats[color] = null;
  if (!room.seats.r && !room.seats.b && io.sockets.adapter.rooms.get(roomId) == null) rooms.delete(roomId);
  else broadcast(roomId);
}

io.on('connection', (socket) => {
  socket.data = {};

  socket.on('join', ({ roomId, name } = {}, ack = () => {}) => {
    roomId = String(roomId ?? '').trim().toLowerCase();
    name = String(name ?? '').trim().slice(0, 20) || 'Khách';
    if (!ROOM_ID.test(roomId)) return ack({ ok: false, error: 'Mã phòng chỉ gồm chữ thường, số, dấu - (tối đa 24 ký tự)' });

    leaveRoom(socket);
    let room = rooms.get(roomId);
    if (!room) {
      room = { game: createGame(), seats: { r: null, b: null } };
      rooms.set(roomId, room);
    }
    const color = !room.seats.r ? RED : !room.seats.b ? BLACK : null; // hết ghế thì vào xem
    if (color) room.seats[color] = { id: socket.id, name };
    socket.data = { roomId, color };
    socket.join(roomId);
    ack({ ok: true, color });
    broadcast(roomId);
  });

  socket.on('move', (move = {}, ack = () => {}) => {
    const { roomId, color } = socket.data;
    const room = rooms.get(roomId);
    if (!room || !color) return ack({ ok: false, error: 'Bạn đang xem, không thể đi' });
    if (!room.seats.r || !room.seats.b) return ack({ ok: false, error: 'Đang chờ đối thủ vào phòng' });
    if (room.game.turn !== color) return ack({ ok: false, error: 'Chưa tới lượt bạn' });
    try {
      room.game = applyMove(room.game, { from: Number(move.from), to: Number(move.to) });
    } catch (err) {
      return ack({ ok: false, error: err.message });
    }
    ack({ ok: true });
    broadcast(roomId);
  });

  socket.on('resign', () => {
    const { roomId, color } = socket.data;
    const room = rooms.get(roomId);
    if (!room || !color) return;
    room.game = resign(room.game, color);
    broadcast(roomId);
  });

  // Ván mới: đổi màu hai bên cho công bằng.
  socket.on('rematch', () => {
    const { roomId, color } = socket.data;
    const room = rooms.get(roomId);
    if (!room || !color || !room.game.result) return;
    room.seats = { r: room.seats.b, b: room.seats.r };
    room.game = createGame();
    for (const seatColor of [RED, BLACK]) {
      const seat = room.seats[seatColor];
      const s = seat && io.sockets.sockets.get(seat.id);
      if (s) { s.data.color = seatColor; s.emit('color', seatColor); }
    }
    broadcast(roomId);
  });

  socket.on('leave', () => leaveRoom(socket));
  socket.on('disconnect', () => leaveRoom(socket));
});

httpServer.listen(PORT, () => console.log(`Xiangqi server: http://localhost:${PORT}`));
