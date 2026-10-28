import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLACK, RED, applyMove, createGame, legalMoves, parseFen, perft, sq, toFen, undo,
} from './xiangqi.js';

const start = parseFen(createGame().startFen);

test('perft từ thế cờ ban đầu khớp số liệu chuẩn', () => {
  assert.equal(perft(start.board, RED, 1), 44);
  assert.equal(perft(start.board, RED, 2), 1920);
  assert.equal(perft(start.board, RED, 3), 79666);
});

test('FEN đọc và ghi lại như cũ', () => {
  const g = createGame();
  assert.equal(toFen(g.board, g.turn), g.startFen);
});

test('pháo đầu và ký hiệu nước đi', () => {
  const g = applyMove(createGame(), { from: sq(7, 7), to: sq(7, 4) });
  assert.equal(g.history[0].notation, 'P2-5');
  assert.equal(g.turn, BLACK);
});

test('không được đi khi không phải lượt', () => {
  assert.throws(() => applyMove(createGame(), { from: sq(3, 0), to: sq(4, 0) }));
});

test('không được để lộ mặt tướng', () => {
  // Tướng hai bên cùng cột, chỉ có Xe đỏ che: Xe không được rời cột.
  const g = createGame('4k4/9/9/9/9/9/9/4R4/9/4K4 w');
  assert.ok(legalMoves(g, sq(7, 4)).every((m) => m.to % 9 === 4));
});

test('chiếu bí kết thúc ván', () => {
  // Đen chỉ có tướng ở góc cung; Đỏ đưa Xe xuống hàng 0 là chiếu bí.
  const g = applyMove(createGame('3k5/9/4R4/9/9/9/9/9/9/3RK4 w'), { from: sq(2, 4), to: sq(0, 4) });
  assert.deepEqual(g.result, { winner: RED, reason: 'checkmate' });
});

test('đi lại khôi phục thế cờ', () => {
  const g = applyMove(createGame(), { from: sq(7, 7), to: sq(7, 4) });
  assert.equal(toFen(undo(g).board, undo(g).turn), createGame().startFen);
});
