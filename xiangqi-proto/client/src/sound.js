// Âm thanh lấy từ asset Ziga (client/public/ziga/sound).
const FILES = {
  move: 'co_di_chuyen.mp3',
  capture: 'co_an_quan.mp3',
  start: 'co_gong.mp3',
  win: 'co_thang.mp3',
  lose: 'co_thua.mp3',
  check: 'alert.ogg',
  select: 'click.ogg',
};

const cache = {};
let muted = false;
try { muted = localStorage.getItem('xq-muted') === '1'; } catch { /* trình duyệt chặn storage */ }

export function play(name) {
  if (muted || !FILES[name]) return;
  cache[name] ??= new Audio(`/ziga/sound/${FILES[name]}`);
  const audio = cache[name].cloneNode();
  audio.volume = 0.8;
  audio.play().catch(() => {}); // chưa có thao tác người dùng thì trình duyệt chặn phát
}

export const isMuted = () => muted;

export function setMuted(value) {
  muted = value;
  try { localStorage.setItem('xq-muted', value ? '1' : '0'); } catch { /* bỏ qua */ }
}
