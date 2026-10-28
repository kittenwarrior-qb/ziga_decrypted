import { useEffect, useMemo, useState } from 'react';
import { BLACK, colOf, colorOf, createGame, findKing, legalMoves, rowOf } from '@xq/shared';

const GLYPH = {
  K: '帥', A: '仕', B: '相', N: '傌', R: '俥', C: '炮', P: '兵',
  k: '將', a: '士', b: '象', n: '馬', r: '車', c: '砲', p: '卒',
};

// Gán id cố định cho từng quân (theo ô xuất phát) để React giữ nguyên phần tử
// khi quân di chuyển -> CSS transition tạo hiệu ứng trượt.
function pieceIds(game) {
  const ids = createGame(game.startFen).board.map((p, s) => (p ? s : null));
  for (const { from, to } of game.history) {
    ids[to] = ids[from];
    ids[from] = null;
  }
  return ids;
}

function BoardLines() {
  const x = (c) => 50 + c * 100;
  const y = (r) => 50 + r * 100;
  const lines = [];
  for (let r = 0; r < 10; r++) lines.push([x(0), y(r), x(8), y(r)]);
  for (let c = 0; c < 9; c++) {
    if (c === 0 || c === 8) lines.push([x(c), y(0), x(c), y(9)]);
    else lines.push([x(c), y(0), x(c), y(4)], [x(c), y(5), x(c), y(9)]);
  }
  lines.push(
    [x(3), y(0), x(5), y(2)], [x(5), y(0), x(3), y(2)],
    [x(3), y(7), x(5), y(9)], [x(5), y(7), x(3), y(9)],
  );
  return (
    <svg className="board-lines" viewBox="0 0 900 1000" aria-hidden="true">
      <rect x="44" y="44" width="812" height="912" className="frame" />
      {lines.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      <text x="250" y="512">楚 河</text>
      <text x="650" y="512">漢 界</text>
    </svg>
  );
}

export default function Board({ game, perspective = 'r', canMove, onMove }) {
  const [selected, setSelected] = useState(null);
  useEffect(() => setSelected(null), [game]);

  const ids = useMemo(() => pieceIds(game), [game]);
  const targets = useMemo(
    () => (selected == null ? [] : legalMoves(game, selected).map((m) => m.to)),
    [game, selected],
  );
  const last = game.history.at(-1);
  const checkedKing = last?.check && game.result?.reason !== 'resign' ? findKing(game.board, game.turn) : -1;

  const place = (s) => {
    let r = rowOf(s);
    let c = colOf(s);
    if (perspective === BLACK) { r = 9 - r; c = 8 - c; }
    return { left: `${(50 + c * 100) / 9}%`, top: `${(50 + r * 100) / 10}%` };
  };

  const clickSquare = (s) => {
    if (selected != null && targets.includes(s)) {
      onMove({ from: selected, to: s });
      setSelected(null);
      return;
    }
    const color = colorOf(game.board[s]);
    if (color && color === game.turn && canMove(color)) setSelected(s === selected ? null : s);
    else setSelected(null);
  };

  return (
    <div className="board">
      <BoardLines />
      {last && <div className="mark" style={place(last.from)} />}
      {last && <div className="mark" style={place(last.to)} />}
      {game.board.map((p, s) => p && (
        <button
          key={ids[s]}
          type="button"
          className={[
            'piece', colorOf(p) === BLACK ? 'black' : 'red',
            s === selected && 'selected',
            targets.includes(s) && 'capturable',
            s === checkedKing && 'checked',
          ].filter(Boolean).join(' ')}
          style={place(s)}
          onClick={() => clickSquare(s)}
        >
          {GLYPH[p]}
        </button>
      ))}
      {targets.filter((s) => !game.board[s]).map((s) => (
        <button key={`t${s}`} type="button" className="target" style={place(s)} onClick={() => clickSquare(s)} aria-label="Đi tới đây" />
      ))}
    </div>
  );
}
