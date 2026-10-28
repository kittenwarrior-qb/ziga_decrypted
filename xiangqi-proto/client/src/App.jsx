import { useState } from 'react';
import { BLACK, RED, applyMove, createGame, opponent, resign, undo } from '@xq/shared';
import Board, { pieceImg } from './Board.jsx';
import { isMuted, setMuted } from './sound.js';
import { useOnlineGame } from './useOnlineGame.js';

const SIDE = { r: 'Đỏ', b: 'Đen' };

// Khung người chơi kiểu Ziga: đồng hồ cát quay ở bên đang tới lượt.
function PlayerPlate({ color, name, active }) {
  return (
    <div className={`plate ${color === BLACK ? 'black' : 'red'} ${active ? 'active' : ''}`}>
      <span className="plate-name">{name || SIDE[color]}</span>
      {active && <span className="hourglass" />}
    </div>
  );
}

// Quân của `color` đã bị đối phương ăn.
function CapturedBox({ history, color }) {
  const lost = history.filter((m) => m.captured && (m.captured === m.captured.toUpperCase()) === (color === RED));
  return (
    <div className="captured-box">
      {lost.map((m, i) => <span key={i} style={{ backgroundImage: `url(${pieceImg(m.captured)})` }} />)}
    </div>
  );
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

function SoundToggle() {
  const [muted, setState] = useState(isMuted);
  const toggle = () => { setMuted(!muted); setState(!muted); };
  return <button type="button" className="icon-btn" onClick={toggle} title="Âm thanh">{muted ? '🔇' : '🔊'}</button>;
}

function ResignButton({ onClick, disabled }) {
  return <button type="button" className="img-btn resign" onClick={onClick} disabled={disabled} aria-label="Xin thua" />;
}

function GameScreen({ game, players, perspective, canMove, onMove, active, viewer, children, error, info }) {
  const top = opponent(perspective);
  const turn = !game.result && active ? game.turn : null;
  return (
    <div className="game">
      <Board game={game} perspective={perspective} canMove={canMove} onMove={onMove} active={active} viewer={viewer} />
      <aside className="panel">
        <PlayerPlate color={top} name={players?.[top]} active={turn === top} />
        <CapturedBox history={game.history} color={top} />
        {info && <p className="info">{info}</p>}
        {error && <p className="error">{error}</p>}
        <div className="moves-wrap">
          <MoveList history={game.history} />
        </div>
        <CapturedBox history={game.history} color={perspective} />
        <PlayerPlate color={perspective} name={players?.[perspective]} active={turn === perspective} />
        <div className="actions">{children}<SoundToggle /></div>
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
      active
      info={game.result ? null : `Lượt ${SIDE[game.turn]}`}
    >
      <ResignButton onClick={() => setGame((g) => resign(g, g.turn))} disabled={!!game.result} />
      <button type="button" onClick={() => setGame((g) => undo(g))} disabled={!game.history.length}>Đi lại</button>
      <button type="button" onClick={() => setFlipped((f) => !f)}>Xoay bàn</button>
      <button type="button" onClick={() => setGame(createGame())}>Ván mới</button>
      <button type="button" onClick={onExit}>Thoát</button>
    </GameScreen>
  );
}

function OnlineGame({ roomId, name, onExit }) {
  const { room, color, connected, error, move, resign: resignOnline, rematch } = useOnlineGame(roomId, name);
  if (!room) return <p className="center">{connected ? 'Đang vào phòng…' : 'Đang kết nối server…'}</p>;
  const waiting = !room.players.r || !room.players.b;
  return (
    <GameScreen
      game={room.game}
      players={room.players}
      perspective={color ?? RED}
      canMove={(c) => c === color && !waiting}
      onMove={move}
      active={!waiting}
      viewer={color}
      error={error || (!connected ? 'Mất kết nối server' : '')}
      info={`Phòng ${roomId} · ${color ? `Bạn cầm ${SIDE[color]}` : 'Đang xem'}${waiting ? ' · Đang chờ đối thủ…' : ''}`}
    >
      {color && !room.game.result && <ResignButton onClick={resignOnline} disabled={waiting} />}
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
