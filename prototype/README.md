# T5 · Trợ lý chat ví điện tử khi giao dịch bị tạm chặn (S03 + S08)

Dữ liệu dựng, không liên kết MoMo. Có 1 lời gọi Claude API thật để phân loại tin nhắn và soạn câu trả lời.

## Chạy

```bash
cp .env.example .env      # điền ANTHROPIC_API_KEY vào .env
node server.js            # Node >= 18, không cần npm install
# mở http://localhost:3000
```

Không có key thì server vẫn chạy: AI lỗi → trợ lý chuyển nhân viên (đường lui an toàn). **Không commit `.env`** (đã có trong `.gitignore`). Key chỉ nằm ở server, trình duyệt không bao giờ thấy.

## Cách demo (4 phút)

1. Chọn **S03**, bấm tin mồi "Người ta đợi sau lưng…" → AI hỏi đúng 1 câu loại trừ → bấm "Trả trực tiếp ở quầy" → gửi xác thực (✔).
2. Reset, **S03**, bấm "Có người gọi bảo tôi chuyển khoản…" → xác thực bị **chặn**, chuyển khẩn.
3. Chọn **S08**, bấm "Mẹ tôi bị gọi điện doạ…" → bảo dừng, giữ giao dịch, không hứa hoàn tiền, chuyển khẩn.
4. Đổi "Đang nhắn từ" sang **Máy khác** → `khoa_vi` bị cấm, chỉ hướng dẫn gọi 1900 54 54 41.
5. Mở tab **Tư vấn viên** → thấy ca, bằng chứng, việc AI đã làm/bị chặn → "Duyệt nhả" hoặc "Giữ + khoá ví"; khách thấy tin nhắn nhân viên.

## Mức tự chủ (do server ép, không chỉ dặn trong prompt)

| Tool | Mức | Ghi chú |
|---|---|---|
| giu_giao_dich | Tự làm | Chỉ khi giao dịch đang giữ |
| yeu_cau_xac_minh | Tự làm có điều kiện | Server chặn nếu có dấu hiệu bị giục/doạ, độ chắc < 0.75, không phải nhóm "gấp thật", hoặc nhắn từ máy khác |
| chuyen_tu_van_vien | Tự làm | Làn khẩn / thường |
| soan_ho_so_chuyen (tool tách thêm) | Tự làm | Tóm tắt, ẩn chuỗi số ≥ 6 chữ số |
| khoa_vi | Cần người duyệt | Chủ ví bấm xác nhận trong app; từ máy khác thì cấm |
| nha_giao_dich | Cấm với AI | Chỉ tư vấn viên (endpoint riêng) |

## Ba lớp phòng thủ

1. Từ khoá phát hiện thao túng / chiếm tài khoản ghi đè phân loại của model.
2. Policy engine quyết định tool nào chạy; AI chỉ *đề xuất*.
3. Bộ lọc đầu ra thay câu trả lời bằng câu an toàn nếu xin OTP/mật khẩu, lộ ngưỡng, hứa hoàn tiền, hoặc nói đã nhả/khoá.

## Nguyên tắc HAX/PAIR → chỗ trên màn hình

- G2 (làm rõ AI): dòng "Bạn đang trò chuyện với trợ lý AI" + nhãn độ chắc.
- G10 (thu hẹp khi nghi ngờ): một câu hỏi mỗi lượt; tự tin thấp → chuyển người.
- G9/G15 (sửa dễ, mời feedback): nút "Trợ lý hiểu sai?".
- PAIR Explainability: dòng "Dựa vào lời bạn: …" và chip trạng thái từng tool.
- PAIR Graceful Failure: lỗi gọi AI → chuyển nhân viên; ngoài giờ trực → nói thẳng.

