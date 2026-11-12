# Prototype — T5 Ví điện tử

Prototype cần **1–2 màn hình** cho ca khó nhất của track: người bị lừa đòi nhả giao dịch hoặc người thật đang gấp.

## Thông tin prototype

- **Link prototype:** _Điền link Figma / v0 / Lovable / website tại đây._
- **Công cụ:** _Điền công cụ đã dùng._
- **Phần được mock:** _Điền phần mô phỏng._
- **Có lời gọi AI thật:** Không.
- **Dữ liệu sử dụng:** Chỉ dùng dữ liệu dựng, không dùng OTP, mật khẩu, số thẻ, số tài khoản hoặc dữ liệu thật.

## Ảnh minh họa

Đặt 1–2 ảnh trong thư mục này và đánh số trực tiếp trên ảnh, ví dụ:

- `screen-1.png`: Màn hình người dùng khi giao dịch bị giữ.
- `screen-2.png`: Màn hình tư vấn viên duyệt hoặc từ chối nhả giao dịch.

Với mỗi số trên ảnh, bổ sung:

1. Thành phần đó thể hiện điều gì.
2. Nguyên tắc HAX/PAIR tương ứng.
3. Mức tự chủ của AI: tự làm / cần người duyệt / cấm.

## Luồng demo bắt buộc

1. Người dùng gửi yêu cầu trong tình huống có rủi ro.
2. AI thể hiện rõ điều chưa chắc và không tiết lộ cơ chế phát hiện gian lận.
3. Người dùng thấy bước tiếp theo và người chịu trách nhiệm quyết định.
4. Tool có hậu quả không đảo ngược, đặc biệt `nha_giao_dich`, không được AI tự thực hiện khi chưa có thẩm quyền.
