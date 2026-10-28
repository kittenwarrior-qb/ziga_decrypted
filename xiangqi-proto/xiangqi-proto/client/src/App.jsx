import { useState } from 'react';
import { BLACK, RED, applyMove, createGame, undo } from '@xq/shared';
import Board from './Board.jsx';
import { useOnlineGame } from './useOnlineGame.js';

const SIDE = { r: 'Đỏ', b: 'Đen' };
const REASON = { checkmate: 'chiếu bí', stalemate: 'đối thủ hết nước đi', resign: 'đối thủ đầu hàng' };

function statusText(game, players) {
  const who = (c) => (players?.[c] ? `${SIDE[c]} (${players[c]})` : SIDE[c]);
  if (game.result) return `${who(game.result.winner)} thắng — ${REASON[game.result.reason]}`;
  const check = game.history.at(-1)?.check ? ' — Đang bị chiếu!' : '';
  return `Lượt ${who(game.turn)}${check}`;
}

function MoveList({ history }) {
  const pairs = [];
  for (let i = 0; i < history.length; i += 2) pairs.push([history[i], history[i + 1]]);
  return (
    <ol className="moves">
      {pairs.map(([r, b], i) => (
        <li key={i}><span className="red-text">{r.notation}</span>{b && <span>{b.notation}</span>}</li>
      ))}
    </ol>
  );
}

function GameScreen({ game, players, perspective, canMove, onMove, children, error }) {
  return (
    <div className="game">
      <Board game={game} perspective={perspective} canMove={canMove} onMove={onMove} />
      <aside className="panel">
        <p className={`status ${game.result ? 'over' : ''}`}>{statusText(game, players)}</p>
        {error && <p className="error">{error}</p>}
        <div className="actions">{children}</div>
        <h3>Nước đi</h3>
        <MoveList history={game.history} />
      </aside>
    </div>
  );
}

function LocalGame({ onExit }) {
  const [game, setGame] = useState(createGame);
  const [flipped, setFlipped] = useState(false);
  return (
    <GameScreen
      game={game}
      perspective={flipped ? BLACK : RED}
      canMove={() => true}
      onMove={(m) => setGame((g) => applyMove(g, m))}
    >
      <button type="button" onClick={() => setGame((g) => undo(g))} disabled={!game.history.length}>Đi lại</button>
      <button type="button" onClick={() => setFlipped((f) => !f)}>Xoay bàn</button>
      <button type="button" onClick={() => setGame(createGame())}>Ván mới</button>
      <button type="button" onClick={onExit}>Thoát</button>
    </GameScreen>
  );
}

function OnlineGame({ roomId, name, onExit }) {
  const { room, color, connected, error, move, resign, rematch } = useOnlineGame(roomId, name);
  if (!room) return <p className="center">{connected ? 'Đang vào phòng…' : 'Đang kết nối server…'}</p>;
  const waiting = !room.players.r || !room.players.b;
  return (
    <GameScreen
      game={room.game}
      players={room.players}
      perspective={color ?? RED}
      canMove={(c) => c === color && !waiting}
      onMove={move}
      error={error || (!connected ? 'Mất kết nối server' : '')}
    >
      <p className="room">
        Phòng <b>{roomId}</b> · Bạn: {color ? SIDE[color] : 'đang xem'}
        {waiting && <><br />Đang chờ đối thủ — gửi mã phòng cho bạn bè</>}
      </p>
      {color && !room.game.result && <button type="button" onClick={resign} disabled={waiting}>Đầu hàng</button>}
      {color && room.game.result && <button type="button" onClick={rematch}>Ván mới (đổi màu)</button>}
      <button type="button" onClick={onExit}>Rời phòng</button>
    </GameScreen>
  );
}

function Home({ onStart }) {
  const params = new URLSearchParams(window.location.search);
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(params.get('room') ?? '');
  const randomRoom = () => setRoomId(Math.random().toString(36).slice(2, 8));
  return (
    <div className="home">
      <h1>Cờ Tướng</h1>
      <button type="button" className="big" onClick={() => onStart({ type: 'local' })}>Hai người cùng máy</button>
      <form
        className="online"
        onSubmit={(e) => {
          e.preventDefault();
          if (roomId.trim()) onStart({ type: 'online', roomId: roomId.trim().toLowerCase(), name: name.trim() });
        }}
      >
        <h2>Chơi online</h2>
        <input placeholder="Tên của bạn" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        <div className="row">
          <input placeholder="Mã phòng" value={roomId} onChange={(e) => setRoomId(e.target.value)} maxLength={24} />
          <button type="button" onClick={randomRoom}>Tạo mã</button>
        </div>
        <button type="submit" className="big" disabled={!roomId.trim()}>Vào phòng</button>
      </form>
      <button type="button" className="big" disabled>Chơi với máy (sắp có)</button>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);
  const exit = () => setMode(null);
  if (mode?.type === 'local') return <LocalGame onExit={exit} />;
  if (mode?.type === 'online') return <OnlineGame roomId={mode.roomId} name={mode.name} onExit={exit} />;
  return <Home onStart={setMode} />;
}
