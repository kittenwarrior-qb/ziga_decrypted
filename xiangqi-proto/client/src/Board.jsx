import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BLACK, colOf, colorOf, createGame, findKing, legalMoves, rowOf, typeOf } from '@xq/shared';
import { play } from './sound.js';

// Lưới đo trên ảnh bàn cờ Ziga (board.png 647x625). Hàng 4 -> 5 cách xa hơn vì có sông.
const BOARD_W = 647;
const BOARD_H = 625;
const GRID_X = Array.from({ length: 9 }, (_, c) => 96.5 + c * 56.875);
const GRID_Y = [53.5, 110.5, 167.5, 224.5, 281.5, 344.5, 401.5, 458.5, 515.5, 572.5];
const MOVE_MS = 320;
const SPARKS = 10;

export const pieceImg = (p) => `/ziga/pieces/${colorOf(p)}${typeOf(p)}.png`;
const REASON = { checkmate: 'Chiếu bí', stalemate: 'Hết nước đi', resign: 'Đầu hàng' };
const SIDE = { r: 'Đỏ', b: 'Đen' };

// Gán id cố định cho từng quân (theo ô xuất phát) để React giữ nguyên phần tử khi quân di chuyển.
function pieceIds(game) {
  const ids = createGame(game.startFen).board.map((p, s) => (p ? s : null));
  for (const { from, to } of game.history) {
    ids[to] = ids[from];
    ids[from] = null;
  }
  return ids;
}

export default function Board({ game, perspective = 'r', canMove, onMove, active = true, viewer = null }) {
  const boardRef = useRef(null);
  const pieceEls = useRef(new Map());
  const mounted = useRef(true);
  const prevGame = useRef(null);
  const startedId = useRef(null);
  const endedId = useRef(null);
  const [selected, setSelected] = useState(null);
  const [fx, setFx] = useState([]);
  const [bannerClosed, setBannerClosed] = useState(null);

  const ids = useMemo(() => pieceIds(game), [game]);
  const targets = useMemo(
    () => (selected == null ? [] : legalMoves(game, selected).map((m) => m.to)),
    [game, selected],
  );
  const last = game.history.at(-1);
  const checkedKing = last?.check && game.result?.reason !== 'resign' ? findKing(game.board, game.turn) : -1;

  const pos = useCallback((s) => {
    let r = rowOf(s);
    let c = colOf(s);
    if (perspective === BLACK) { r = 9 - r; c = 8 - c; }
    return { x: (GRID_X[c] / BOARD_W) * 100, y: (GRID_Y[r] / BOARD_H) * 100 };
  }, [perspective]);
  const place = (s) => { const { x, y } = pos(s); return { left: `${x}%`, top: `${y}%` }; };

  // Không hủy hẹn giờ khi dọn effect: StrictMode chạy effect 2 lần ở dev và sẽ xóa mất
  // hẹn giờ gỡ hiệu ứng. Thay vào đó bỏ qua âm thanh nếu Board đã bị gỡ khỏi trang.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const later = (fn, ms) => setTimeout(() => mounted.current && fn(), ms);
  const addFx = useCallback((effect, ms) => {
    const key = `${effect.type}-${Math.random()}`;
    setFx((list) => [...list, { ...effect, key }]);
    setTimeout(() => setFx((list) => list.filter((f) => f.key !== key)), ms);
  }, []);

  useEffect(() => setSelected(null), [game]);

  // Hiệu ứng nước đi: quân nhấc lên, bay tới ô mới rồi đáp xuống (FLIP bằng Web Animations API).
  useLayoutEffect(() => {
    const prev = prevGame.current;
    prevGame.current = game;
    if (!prev || prev.id !== game.id || game.history.length !== prev.history.length + 1) return;
    const m = game.history.at(-1);
    const el = pieceEls.current.get(ids[m.to]);
    const box = boardRef.current.getBoundingClientRect();
    const a = pos(m.from);
    const b = pos(m.to);
    const dx = ((a.x - b.x) / 100) * box.width;
    const dy = ((a.y - b.y) / 100) * box.height;
    if (el) {
      el.style.zIndex = 6;
      el.animate([
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(1)`, filter: 'drop-shadow(0 3px 3px rgb(0 0 0 / 0.5))' },
        { transform: `translate(-50%, -50%) translate(${dx * 0.45}px, ${dy * 0.45}px) scale(1.25)`, filter: 'drop-shadow(0 14px 10px rgb(0 0 0 / 0.45))', offset: 0.45 },
        { transform: 'translate(-50%, -50%) scale(1)', filter: 'drop-shadow(0 3px 3px rgb(0 0 0 / 0.5))' },
      ], { duration: MOVE_MS, easing: 'cubic-bezier(.3,.1,.25,1)' }).onfinish = () => { el.style.zIndex = ''; };
    }
    if (m.captured) addFx({ type: 'captured', square: m.to, piece: m.captured }, MOVE_MS + 800);
    later(() => {
      addFx({ type: 'land', square: m.to }, 500);
      if (m.captured) {
        play('capture');
        boardRef.current?.animate([
          { transform: 'translate(0, 0)' }, { transform: 'translate(-4px, 2px)' }, { transform: 'translate(4px, -2px)' },
          { transform: 'translate(-2px, -1px)' }, { transform: 'translate(0, 0)' },
        ], { duration: 260, easing: 'ease-out' });
      } else {
        play('move');
      }
      if (m.check && !game.result) {
        play('check');
        addFx({ type: 'chieu' }, 1700);
      }
    }, MOVE_MS * 0.85);
  }, [game, ids, pos, addFx]);

  // "Bắt đầu" khi một ván mới sẵn sàng.
  useEffect(() => {
    if (!active || game.history.length || game.result || startedId.current === game.id) return;
    startedId.current = game.id;
    play('start');
    addFx({ type: 'start' }, 2000);
  }, [active, game, addFx]);

  // Âm thanh thắng / thua khi ván kết thúc.
  const result = game.result;
  const won = !viewer || result?.winner === viewer;
  useEffect(() => {
    if (!result || endedId.current === game.id) return;
    endedId.current = game.id;
    later(() => play(won ? 'win' : 'lose'), MOVE_MS + 300);
  }, [result, won, game.id]);

  const clickSquare = (s) => {
    if (selected != null && targets.includes(s)) {
      onMove({ from: selected, to: s });
      setSelected(null);
      return;
    }
    const color = colorOf(game.board[s]);
    if (color && color === game.turn && canMove(color) && s !== selected) {
      play('select');
      setSelected(s);
    } else {
      setSelected(null);
    }
  };

  return (
    <div className="board" ref={boardRef}>
      <img className={`board-img ${perspective === BLACK ? 'flipped' : ''}`} src="/ziga/board.png" alt="" draggable="false" />

      {last && <img className="sq last-from" style={place(last.from)} src="/ziga/common/nuoc_vua_di_small.png" alt="" />}
      {last && <img className="sq last-to" style={place(last.to)} src="/ziga/common/nuocvuadi.png" alt="" />}
      {checkedKing >= 0 && <img className="sq check-ring" style={place(checkedKing)} src="/ziga/common/trangthai_chieutuong.png" alt="" />}
      {selected != null && <img className="sq select-ring" style={place(selected)} src="/ziga/common/cochonquan.png" alt="" />}

      {game.board.map((p, s) => p && (
        <button
          key={ids[s]}
          ref={(el) => (el ? pieceEls.current.set(ids[s], el) : pieceEls.current.delete(ids[s]))}
          type="button"
          className={[
            'piece',
            s === selected && 'selected',
            colorOf(p) === game.turn && canMove(colorOf(p)) && !game.result && 'movable',
          ].filter(Boolean).join(' ')}
          style={{ ...place(s), backgroundImage: `url(${pieceImg(p)})` }}
          onClick={() => clickSquare(s)}
          aria-label={p}
        />
      ))}

      {targets.map((s) => (game.board[s]
        ? <img key={`c${s}`} className="sq capture-ring" style={place(s)} src="/ziga/common/trangthai_quananduoc.png" alt="" />
        : (
          <button key={`t${s}`} type="button" className="sq target" style={place(s)} onClick={() => clickSquare(s)} aria-label="Đi tới đây">
            <img src="/ziga/common/nuocdi.png" alt="" />
          </button>
        )))}

      {fx.map((f) => {
        if (f.type === 'captured') {
          return (
            <div key={f.key} className="sq captured" style={{ ...place(f.square), '--delay': `${MOVE_MS * 0.85}ms` }}>
              <div className="ghost" style={{ backgroundImage: `url(${pieceImg(f.piece)})` }} />
              <img className="flash" src="/ziga/common/trangthai_quananduoc.png" alt="" />
              {Array.from({ length: SPARKS }, (_, i) => <i key={i} style={{ '--a': `${(360 / SPARKS) * i}deg` }} />)}
            </div>
          );
        }
        if (f.type === 'land') return <div key={f.key} className="sq land" style={place(f.square)} />;
        if (f.type === 'chieu') {
          return (
            <div key={f.key} className="overlay">
              <img className="red-frame" src="/ziga/common/Chess_redstatus.png" alt="" />
              <img className="chieu" src="/ziga/common/chieutuong.png" alt="Chiếu" />
            </div>
          );
        }
        if (f.type === 'start') return <div key={f.key} className="overlay"><div className="batdau" /></div>;
        return null;
      })}

      {result && bannerClosed !== game.id && (
        <button type="button" className="overlay banner" onClick={() => setBannerClosed(game.id)}>
          <img className="rays" src="/ziga/common/bg_count_down_co.png" alt="" />
          <img className="banner-img" src={`/ziga/common/${won ? 'Thang' : 'Thua'}.png`} alt={won ? 'Thắng' : 'Thua'} />
          <span className="banner-text">
            {!viewer && `${SIDE[result.winner]} thắng · `}{REASON[result.reason]}
          </span>
        </button>
      )}
    </div>
  );
}
