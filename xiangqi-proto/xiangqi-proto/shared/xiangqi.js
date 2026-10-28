// Luật Cờ Tướng thuần JS, dùng chung cho client, server và (sau này) AI.
// Bàn cờ là mảng 90 ô, ô = hàng * 9 + cột. Hàng 0 ở phía Đen (trên), hàng 9 ở phía Đỏ (dưới).
// Quân: chữ hoa = Đỏ, chữ thường = Đen. K Tướng, A Sĩ, B Tượng, N Mã, R Xe, C Pháo, P Tốt.

export const ROWS = 10;
export const COLS = 9;
export const RED = 'r';
export const BLACK = 'b';
export const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';

const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export const sq = (r, c) => r * COLS + c;
export const rowOf = (s) => Math.floor(s / COLS);
export const colOf = (s) => s % COLS;
export const opponent = (color) => (color === RED ? BLACK : RED);
export const colorOf = (p) => (p ? (p === p.toUpperCase() ? RED : BLACK) : null);
export const typeOf = (p) => p.toUpperCase();

const inBoard = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const inPalace = (color, r, c) => c >= 3 && c <= 5 && (color === RED ? r >= 7 && r <= 9 : r >= 0 && r <= 2);
const onOwnSide = (color, r) => (color === RED ? r >= 5 : r <= 4);

export function parseFen(fen) {
  const [placement, turn = 'w'] = fen.trim().split(/\s+/);
  const board = new Array(ROWS * COLS).fill(null);
  placement.split('/').forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) c += Number(ch);
      else board[sq(r, c++)] = ch;
    }
  });
  return { board, turn: turn === 'b' ? BLACK : RED };
}

export function toFen(board, turn) {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let row = '';
    let empty = 0;
    for (let c = 0; c < COLS; c++) {
      const p = board[sq(r, c)];
      if (!p) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      row += p;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} ${turn === BLACK ? 'b' : 'w'}`;
}

// Nước đi giả hợp lệ (chưa xét bị chiếu / lộ mặt tướng).
export function pseudoMoves(board, from) {
  const p = board[from];
  if (!p) return [];
  const color = colorOf(p);
  const r = rowOf(from);
  const c = colOf(from);
  const out = [];
  const add = (r2, c2) => {
    if (!inBoard(r2, c2)) return;
    const target = board[sq(r2, c2)];
    if (!target || colorOf(target) !== color) out.push(sq(r2, c2));
  };

  switch (typeOf(p)) {
    case 'K':
      for (const [dr, dc] of ORTHO) if (inPalace(color, r + dr, c + dc)) add(r + dr, c + dc);
      break;
    case 'A':
      for (const [dr, dc] of DIAG) if (inPalace(color, r + dr, c + dc)) add(r + dr, c + dc);
      break;
    case 'B':
      for (const [dr, dc] of DIAG) {
        const r2 = r + 2 * dr;
        const c2 = c + 2 * dc;
        if (inBoard(r2, c2) && onOwnSide(color, r2) && !board[sq(r + dr, c + dc)]) add(r2, c2);
      }
      break;
    case 'N':
      for (const [dr, dc] of ORTHO) {
        if (!inBoard(r + dr, c + dc) || board[sq(r + dr, c + dc)]) continue; // cản chân mã
        if (dr !== 0) { add(r + 2 * dr, c - 1); add(r + 2 * dr, c + 1); }
        else { add(r - 1, c + 2 * dc); add(r + 1, c + 2 * dc); }
      }
      break;
    case 'R':
      for (const [dr, dc] of ORTHO) {
        for (let r2 = r + dr, c2 = c + dc; inBoard(r2, c2); r2 += dr, c2 += dc) {
          const t = board[sq(r2, c2)];
          if (!t) { out.push(sq(r2, c2)); continue; }
          if (colorOf(t) !== color) out.push(sq(r2, c2));
          break;
        }
      }
      break;
    case 'C':
      for (const [dr, dc] of ORTHO) {
        let jumped = false;
        for (let r2 = r + dr, c2 = c + dc; inBoard(r2, c2); r2 += dr, c2 += dc) {
          const t = board[sq(r2, c2)];
          if (!jumped) {
            if (!t) out.push(sq(r2, c2));
            else jumped = true; // gặp ngòi
          } else if (t) {
            if (colorOf(t) !== color) out.push(sq(r2, c2));
            break;
          }
        }
      }
      break;
    case 'P': {
      const forward = color === RED ? -1 : 1;
      add(r + forward, c);
      if (!onOwnSide(color, r)) { add(r, c - 1); add(r, c + 1); } // qua sông được đi ngang
      break;
    }
  }
  return out;
}

export function findKing(board, color) {
  const king = color === RED ? 'K' : 'k';
  return board.indexOf(king);
}

function kingsFacing(board) {
  const rk = findKing(board, RED);
  const bk = findKing(board, BLACK);
  if (rk < 0 || bk < 0 || colOf(rk) !== colOf(bk)) return false;
  for (let s = bk + COLS; s < rk; s += COLS) if (board[s]) return false;
  return true;
}

export function isAttacked(board, square, byColor) {
  for (let s = 0; s < board.length; s++) {
    if (colorOf(board[s]) === byColor && pseudoMoves(board, s).includes(square)) return true;
  }
  return false;
}

export function inCheck(board, color) {
  const k = findKing(board, color);
  return k < 0 || isAttacked(board, k, opponent(color)) || kingsFacing(board);
}

function movePiece(board, from, to) {
  const next = board.slice();
  next[to] = next[from];
  next[from] = null;
  return next;
}

// Mọi nước đi hợp lệ của bên `color` (hoặc chỉ của quân ở ô `from`).
export function legalMovesFor(board, color, from = null) {
  const moves = [];
  const squares = from == null ? board.keys() : [from];
  for (const s of squares) {
    if (colorOf(board[s]) !== color) continue;
    for (const to of pseudoMoves(board, s)) {
      if (!inCheck(movePiece(board, s, to), color)) moves.push({ from: s, to });
    }
  }
  return moves;
}

export function createGame(fen = START_FEN) {
  const { board, turn } = parseFen(fen);
  return { startFen: fen, board, turn, history: [], result: null };
}

export function legalMoves(game, from = null) {
  if (game.result) return [];
  return legalMovesFor(game.board, game.turn, from);
}

export function applyMove(game, { from, to }) {
  if (game.result) throw new Error('Ván cờ đã kết thúc');
  const piece = game.board[from];
  if (!piece || colorOf(piece) !== game.turn) throw new Error('Không phải lượt của quân này');
  if (!legalMoves(game, from).some((m) => m.to === to)) throw new Error('Nước đi không hợp lệ');

  const board = movePiece(game.board, from, to);
  const turn = opponent(game.turn);
  const check = inCheck(board, turn);
  const move = { from, to, piece, captured: game.board[to], check, notation: notate(game.board, from, to) };
  let result = null;
  // Luật cờ tướng: bên không còn nước đi (bị chiếu bí hoặc hết nước) là thua.
  if (legalMovesFor(board, turn).length === 0) {
    result = { winner: game.turn, reason: check ? 'checkmate' : 'stalemate' };
  }
  return { ...game, board, turn, history: [...game.history, move], result };
}

export function resign(game, color) {
  if (game.result) return game;
  return { ...game, result: { winner: opponent(color), reason: 'resign' } };
}

// Đi lại: dựng lại ván từ đầu với ít nước hơn.
export function undo(game, plies = 1) {
  let g = createGame(game.startFen);
  for (const m of game.history.slice(0, Math.max(0, game.history.length - plies))) g = applyMove(g, m);
  return g;
}

// Ký hiệu kiểu Việt Nam: P2-5 (bình), M2.3 (tiến), X1/2 (thoái).
const VN_NAME = { K: 'Tg', A: 'S', B: 'T', N: 'M', R: 'X', C: 'P', P: 'B' };

export function notate(board, from, to) {
  const piece = board[from];
  const color = colorOf(piece);
  const file = (c) => (color === RED ? COLS - c : c + 1);
  const [r1, c1, r2, c2] = [rowOf(from), colOf(from), rowOf(to), colOf(to)];
  const forward = color === RED ? r2 < r1 : r2 > r1;
  const type = typeOf(piece);
  let action;
  let dest;
  if (r1 === r2) { action = '-'; dest = file(c2); }
  else {
    action = forward ? '.' : '/';
    // Quân đi chéo (Mã, Tượng, Sĩ) ghi cột đích; quân đi thẳng ghi số bước.
    dest = ['N', 'B', 'A'].includes(type) ? file(c2) : Math.abs(r2 - r1);
  }
  return `${VN_NAME[type]}${file(c1)}${action}${dest}`;
}

export function perft(board, color, depth) {
  if (depth === 0) return 1;
  let nodes = 0;
  for (const { from, to } of legalMovesFor(board, color)) {
    nodes += depth === 1 ? 1 : perft(movePiece(board, from, to), opponent(color), depth - 1);
  }
  return nodes;
}
