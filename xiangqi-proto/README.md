# Cờ Tướng thử nghiệm (React + Vite + Socket.IO)

```
shared/   Luật cờ thuần JS (dùng chung client, server, AI sau này) + test
server/   Socket.IO: phòng chơi, server tự kiểm tra mọi nước đi
client/   React + Vite: bàn cờ SVG, quân cờ trượt bằng CSS transition
```

## Chạy

```bash
npm install
npm run dev     # server :3001 + client http://localhost:5173
npm test        # test luật cờ (gồm perft 44 / 1920 / 79666)
```

Chơi online trong mạng LAN: máy khác mở `http://<IP-máy-bạn>:5173/?room=<mã-phòng>`.
Đổi cổng server bằng biến `XQ_SERVER_PORT` (nhớ sửa proxy trong `client/vite.config.js`).

## Asset & hiệu ứng (Ziga)

Ảnh và âm thanh lấy từ game Ziga (`ziga_assets/res/w`), **chỉ dùng cho bản thử nghiệm cá nhân**.
`client/public/ziga/` được tạo bằng script cắt spritesheet Cocos (.plist):

```bash
python tools/slice_ziga_assets.py   # cần Pillow
```

| Hiệu ứng | Asset |
|---|---|
| Quân nhấc lên - bay - đáp (Web Animations) + vòng sáng khi đáp | `pieces/*.png` |
| Chọn quân: vòng xoay | `common/cochonquan.png` |
| Nước đi được / quân ăn được | `common/nuocdi.png`, `common/trangthai_quananduoc.png` |
| Nước vừa đi | `common/nuocvuadi.png`, `common/nuoc_vua_di_small.png` |
| Ăn quân: quân vỡ + tia lửa + rung bàn | CSS |
| Chiếu: chữ "Chiếu" + viền đỏ + vòng sáng quanh tướng | `common/chieutuong.png`, `Chess_redstatus.png`, `trangthai_chieutuong.png` |
| Bắt đầu ván (5 khung) | `batdau_strip.png` |
| Thắng / Thua | `common/Thang.png`, `Thua.png`, `bg_count_down_co.png` |
| Đồng hồ cát bên đang đi (33 khung) | `hourglass_strip.png` |
| Âm thanh đi / ăn / chiếu / gong / thắng / thua | `sound/*` |

## API luật cờ (`@xq/shared`)

| Hàm | Ý nghĩa |
|---|---|
| `createGame(fen?)` | Ván mới (mặc định thế cờ ban đầu) |
| `legalMoves(game, from?)` | Nước đi hợp lệ `{from, to}`; ô = `hàng * 9 + cột`, hàng 0 phía Đen |
| `applyMove(game, move)` | Trả về ván mới (không sửa ván cũ), ném lỗi nếu nước sai |
| `undo(game, n)` / `resign(game, color)` | Đi lại / đầu hàng |
| `legalMovesFor(board, color)`, `inCheck`, `perft` | Dùng cho AI |

Kết thúc ván: chiếu bí hoặc hết nước đi (bên hết nước thua), đầu hàng.
Chưa có: luật cấm chiếu dai / đuổi dai, đồng hồ, chơi với máy.

## Chơi với máy (bước tiếp)

`shared/xiangqi.js` không phụ thuộc React hay server nên AI có thể chạy trong Web Worker:
gọi `legalMovesFor` + `applyMove` trong minimax / alpha-beta với hàm đánh giá theo giá trị quân
và bảng vị trí. Khi cần mạnh hơn, chuyển sang mảng số + make/unmake thay vì copy bàn cờ.
