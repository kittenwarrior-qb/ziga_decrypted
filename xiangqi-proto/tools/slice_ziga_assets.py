"""Cắt asset Ziga (spritesheet Cocos .plist) thành ảnh rời cho client.

Chạy: python tools/slice_ziga_assets.py [thư_mục_res_w]
Mặc định đọc ziga_assets/res/w và ghi vào client/public/ziga/.
Asset thuộc bản quyền Ziga, chỉ dùng cho bản thử nghiệm cá nhân.
"""
import plistlib
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'ziga_assets' / 'res' / 'w'
OUT = ROOT / 'client' / 'public' / 'ziga'

SHEETS = {
    'common': 'common/chess/chess_common',
    'batdau': 'common/chess/bat_dau_effect',
    'hourglass': 'main_screen/hourglass_plist',
}
# Thứ tự quân trong all_chess_ziga.png (mỗi ô 60x60): Xe Mã Tượng Sĩ Tướng Tốt Pháo
PIECE_ORDER = 'RNBAKPC'
SOUNDS = ['co_di_chuyen.mp3', 'co_an_quan.mp3', 'co_gong.mp3', 'co_thang.mp3', 'co_thua.mp3', 'alert.ogg', 'click.ogg']


def nums(s):
    return [int(float(n)) for n in re.findall(r'-?\d+(?:\.\d+)?', s)]


def slice_sheet(name, base):
    sheet = Image.open(SRC / f'{base}_ziga.png').convert('RGBA')
    frames = plistlib.load(open(SRC / f'{base}.plist', 'rb'))['frames']
    out_dir = OUT / name
    out_dir.mkdir(parents=True, exist_ok=True)
    for frame_name, f in frames.items():
        x, y, w, h = nums(f['textureRect'])
        src_w, src_h = nums(f['spriteSourceSize'])
        off_x, off_y = nums(f['spriteOffset'])
        if f.get('textureRotated'):
            # Cocos lưu khung xoay 90° theo chiều kim đồng hồ -> xoay ngược lại.
            img = sheet.crop((x, y, x + h, y + w)).rotate(90, expand=True)
        else:
            img = sheet.crop((x, y, x + w, y + h))
        canvas = Image.new('RGBA', (src_w, src_h))
        # spriteOffset tính từ tâm, trục y hướng lên.
        canvas.paste(img, ((src_w - w) // 2 + off_x, (src_h - h) // 2 - off_y))
        canvas.save(out_dir / frame_name)
    print(f'{name}: {len(frames)} khung')


def make_strip(name, frame_names):
    """Ghép các khung thành 1 dải ngang để CSS chạy animation bằng steps()."""
    frames = [Image.open(OUT / name / f) for f in frame_names]
    w, h = frames[0].size
    strip = Image.new('RGBA', (w * len(frames), h))
    for i, f in enumerate(frames):
        strip.paste(f, (i * w, 0))
    strip.save(OUT / f'{name}_strip.png')
    print(f'{name}_strip: {len(frames)} khung {w}x{h}')


def slice_pieces():
    sheet = Image.open(SRC / 'ingame' / 'all_chess_ziga.png').convert('RGBA')
    out_dir = OUT / 'pieces'
    out_dir.mkdir(parents=True, exist_ok=True)
    for row, color in enumerate('rb'):
        for i, t in enumerate(PIECE_ORDER):
            sheet.crop((i * 60, row * 60, i * 60 + 60, row * 60 + 60)).save(out_dir / f'{color}{t}.png')
    print('pieces: 14 quân')


def main():
    # Xóa nội dung cũ (giữ thư mục, tránh lỗi khi Vite/Explorer đang mở nó).
    OUT.mkdir(parents=True, exist_ok=True)
    for p in OUT.iterdir():
        shutil.rmtree(p) if p.is_dir() else p.unlink()
    for name, base in SHEETS.items():
        slice_sheet(name, base)
    make_strip('hourglass', [f'frame_{i:02d}.png' for i in range(33)])
    make_strip('batdau', [f'frame_{i}.png' for i in range(5)])
    slice_pieces()
    shutil.copy(SRC / 'ingame' / 'ban_co_ziga.png', OUT / 'board.png')
    # Nền ingame của Ziga đã vẽ sẵn bàn cờ nên dùng nền tranh thủy mặc của màn hình chính.
    shutil.copy(SRC / 'main_screen' / 'background_ziga.jpg', OUT / 'background.jpg')
    (OUT / 'sound').mkdir()
    for s in SOUNDS:
        shutil.copy(SRC / 'sound' / s, OUT / 'sound' / s)
    print('Xong ->', OUT)


if __name__ == '__main__':
    main()
