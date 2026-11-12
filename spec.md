# Bài nộp LAB5 — T5 Ví điện tử · Nhóm ABC

**Lớp:** L3A · **Bàn / zone:** _Điền tại lớp_ · **Track:** T5 — Ví điện tử

| Họ và Tên | Mã Học Viên | Việc đã làm |
|---|---|---|
| Ngô Huy Hoàng | 2A202603622 | _Điền sau_ |
| _Thành viên 2_ | _Mã học viên_ | _Điền sau_ |
| _Thành viên 3_ | _Mã học viên_ | _Điền sau_ |

> Nhóm cần đúng 3 thành viên. Mỗi quyết định nên ghi đủ: các phương án đã cân nhắc, phương án được chọn, lý do chọn và lý do loại các phương án còn lại.

## §1. Lát cắt & phạm vi

- **Lát cắt:** Trong **Chat với ví (giống Chat với MoMo)**, khi **người dùng ví** đang lo lắng nhắn hỏi vì một giao dịch bị giữ, bị giục chuyển tiền gấp, hoặc thấy tiền bị trừ lạ, **AI tự trả lời và hướng dẫn thao tác, hỏi lại cho rõ, hay chuyển tư vấn viên**, để tiền không đi sai chỗ, mà khách thật đang gấp không bị bỏ lơ.
- **Không làm 1:** _Điền tính năng không làm và lý do._
- **Không làm 2:** _Điền tính năng không làm và lý do._
- **Không làm 3:** _Điền tính năng không làm và lý do._

## §2. Kịch bản rủi ro (chặng 2)

- Viết ít nhất 8 kịch bản; mỗi lớp ①②③④ có ít nhất một kịch bản.
- Mỗi kịch bản gồm: tin người dùng · lớp · AI có thể sai thế nào · sản phẩm tốt nên làm gì · nhãn (nhẹ / sửa được / không chấp nhận được).
- Cột “AI có thể sai thế nào” cần trỏ về một tool, một dòng dữ liệu của track hoặc chỗ dữ liệu không có.
- **Quyết định:** Chọn 2 kịch bản đắt nhất; giải thích vì sao chúng đắt hơn các kịch bản còn lại, kịch bản nào suýt được chọn và vì sao không.

## §3. Khi AI sai (chặng 3)

Với mỗi kịch bản đắt nhất:

- AI nói gì (nguyên văn) · người dùng thấy gì · làm gì tiếp · ai được báo, sau bao lâu.
- **Quyết định:** hỏi lại / trả lời kèm giới hạn / dừng và chuyển người — chọn cách nào, loại cách nào và vì sao.
- Loại lỗi (hệ thống / người dùng / ngữ cảnh) và vì sao cách nói, cách sửa phù hợp với loại lỗi đó.
- 2–3 nguyên tắc HAX/PAIR, mỗi nguyên tắc trỏ vào một câu chữ hoặc vị trí cụ thể trên màn hình.
- Lỗi nào sửa câu chữ không cứu được (nếu có), và thiết kế cứu nó thế nào.

## §4. Mức tự chủ (chặng 4)

Với mỗi tool:

| Tool | Mức nhóm chọn | Cost-of-error, khả năng đảo lại và chi phí chờ | Phương án cân nhắc, lý do loại |
|---|---|---|---|
| `giu_giao_dich` | **Tự làm**, khi giao dịch đang giữ và có dấu hiệu lừa đảo/chiếm tài khoản; không giữ lại giao dịch đã hoàn tất | Giữ nhầm làm khách thật chậm thanh toán (ví dụ S03), có thể được nhân viên xem xét nhả; bỏ giữ nhầm ở S01 có thể làm tiền đi và khó thu hồi. Chờ duyệt từng lần tăng thời gian phản ứng khi đang bị lừa | Loại **cần duyệt mọi lần** vì chậm ngăn rủi ro; loại **AI tự nhả sau khi giữ** vì hậu quả tiền đi khó đảo ngược |
| `yeu_cau_xac_minh` | **Tự làm có điều kiện**: chỉ khi phân loại `gap_that`, `tu_tin >= 0.75`, giao dịch đang giữ, ở phiên chủ ví, không phát hiện dấu hiệu bị thúc ép | Gửi xác thực sai lúc nạn nhân bị ép có thể thúc đẩy chuyển tiền; chặn nhầm khiến khách thật chậm thanh toán. Gửi yêu cầu xác thực không đồng nghĩa nhả giao dịch; vẫn có thể chuyển nhân viên | Loại **tự gửi trong mọi tình huống** vì xác thực danh tính không chứng minh giao dịch an toàn; loại **luôn cần người duyệt trước khi gửi** vì khách thật phải đợi vô ích |
| `khoa_vi` | **Cần người duyệt**: chủ ví xác nhận trong phiên hợp lệ; nếu ngoài phiên chủ ví thì AI không khóa. Tư vấn viên demo có thao tác riêng | Khóa nhầm làm chủ ví không sử dụng được ví, mở lại có thể mất nhiều giờ; không khóa kịp có thể phát sinh giao dịch trái phép. Chờ xác nhận mất thời gian nhưng tránh AI khóa nhầm hoặc người khác khóa hộ | Loại **AI tự khóa** vì ảnh hưởng lớn tới quyền sử dụng tài khoản; loại **cấm khóa hoàn toàn** vì chủ ví vẫn cần cách tự bảo vệ khẩn cấp. **Người duyệt thấy:** đề xuất khóa, cảnh báo hậu quả, nút xác nhận hoặc bỏ qua. **Quá hạn:** bản demo không có bộ đếm hết hạn; khi chưa xác nhận, ví chưa khóa và vẫn có đường chuyển nhân viên/tổng đài |
| `soan_ho_so_chuyen` | **Tự làm** | Tóm tắt sai có thể làm nhân viên hiểu nhầm, nhưng nhân viên vẫn xem lại thông tin trước khi quyết định; có thể sửa/bổ sung. Nếu chờ duyệt mới soạn thì tăng thời gian xử lý | Loại **cần duyệt trước khi soạn** vì đây là bước chuẩn bị, chưa làm tiền di chuyển; không cho bản tóm tắt thay thế xác minh của nhân viên |
| `chuyen_tu_van_vien` | **Tự làm** | Chuyển nhầm làm tăng tải hỗ trợ và thời gian chờ; không chuyển khi có lừa đảo/AI không chắc có thể gây mất tiền. Việc chuyển không tự nhả tiền, hậu quả tương đối dễ xử lý | Loại **chỉ chuyển khi người dùng yêu cầu** vì ca nguy hiểm cần chủ động nâng cấp; loại **AI tự quyết giao dịch thay nhân viên** vì vượt quyền. Ngoài giờ trực 8h–20h, hệ thống ghi nhận để xử lý khi vào ca, không hứa có người xử lý ngay |
| `nha_giao_dich` | **Cấm đối với AI; cần tư vấn viên duyệt bằng màn hình riêng** | Nhả nhầm ở S01 có thể khiến tiền đi trong vài giây và không lấy lại; giữ lâu ở S03 làm khách thật chậm thanh toán. Chi phí chờ nhân viên được chấp nhận vì chi phí mất tiền khó đảo ngược lớn hơn | Loại **AI tự nhả** kể cả sau xác thực khuôn mặt, vì chủ ví có thể đang bị ép; loại **cấm nhả với mọi vai trò** vì khách thật cần kênh xử lý. **Người duyệt thấy:** loại ca, giao dịch, người nhắn, độ chắc, lý do, bằng chứng, việc AI đã làm/bị chặn và cảnh báo. **Quá hạn:** bản demo chưa có SLA tự động; giao dịch tiếp tục ở trạng thái giữ, người dùng được hướng dẫn liên hệ nhân viên/tổng đài |
Thêm:

### Tool khó xếp mức tự chủ nhất

**Tool:** `yeu_cau_xac_minh`

| Thành viên | Lựa chọn | Lý do |
|---|---|---|
| Bảo | Tự làm | Giúp S03 xử lý nhanh, nhưng có nguy cơ xác thực cho người đang bị lừa (S01). |
| Dũng | Cần người duyệt | An toàn hơn với S01, nhưng khiến S03 phải chờ lâu. |
| Hoàng | Cấm | Tránh rủi ro xác thực sai, nhưng làm chậm cả giao dịch hợp lệ. |

**Nhóm chốt:** Tự làm có điều kiện. Server chỉ cho gửi xác thực khi đúng phiên chủ ví, giao dịch đang giữ, không có dấu hiệu thao túng và AI đủ độ chắc (≥ 0,75).

### Thử mức tự chủ trên 3 kịch bản

| Kịch bản | Kết quả theo thiết kế |
|---|---|
| **S01 – Bị lừa** | Chặn nhả giao dịch, không gửi xác thực khi phát hiện thao túng, chuyển nhân viên khẩn. |
| **S08 – Khóa ví mẹ** | Không cho khóa ví từ máy khác, không hứa hoàn tiền, hướng dẫn liên hệ hỗ trợ. |
| **S03 – Viện phí** | Hỏi để loại trừ lừa đảo, sau đó gửi xác thực nếu đủ điều kiện, tránh chờ nhân viên không cần thiết. |

**Hạn chế:** Server chưa bắt buộc phải có câu trả lời loại trừ trước khi gửi xác thực, nên S03 vẫn có nguy cơ thực hiện quá sớm. Các kết quả trên cần được kiểm chứng khi chạy demo.

### Luật bổ sung và tách bước

- `nha_giao_dich`: Cấm AI, chỉ tư vấn viên quyết định vì tiền khó thu hồi.
- `khoa_vi`: AI đề xuất → chủ ví xác nhận, tránh khóa nhầm.
- `yeu_cau_xac_minh`: Server kiểm tra điều kiện trước khi thực hiện.
- `soan_ho_so_chuyen` → `chuyen_tu_van_vien`: Tóm tắt bằng chứng trước khi chuyển người, tránh khách phải kể lại.

### Lời hứa thay đổi với người dùng

**Trước:** AI có thể tự mở giao dịch khi đủ độ chắc.

**Sau:** AI chỉ hướng dẫn, hỗ trợ xác thực và chuyển nhân viên; không tự nhả giao dịch.

**Lý do:** Chấp nhận người dùng hợp lệ phải chờ thêm (S03) để tránh mất tiền không thể đảo ngược khi AI nhận diện sai (S01).

## §5. Prototype (chặng 5)

- **Link hoặc file:** _Điền link prototype hoặc đường dẫn file._
- **Công cụ:** HTML, CSS, JavaScript (giao diện), Node.js (backend), OpenAI/Anthropic API.
- **Phần mock:** _Giao dịch ví điện tử, trạng thái khóa ví, xác thực danh tính, hàng đợi tư vấn viên và thao tác duyệt giao dịch. Không kết nối hệ thống thanh toán thật.
- **Có lời gọi AI thật:** Có, khi cấu hình API key và chọn provider.
![alt text](<img width="1918" height="1009" alt="download" src="https://github.com/user-attachments/assets/0cc84b78-d8f2-40f7-966f-52a5ccd873a7" />
)
**Ảnh 1 – Giao diện chat AI và kiểm soát hành động:** Hiển thị độ chắc, bằng chứng, trạng thái tool và quyền chuyển tư vấn viên. Áp dụng HAX G1/G2, G10 và PAIR Explainability/User Control. AI được tự giữ giao dịch, soạn hồ sơ và chuyển nhân viên nhưng không được tự nhả tiền.
![alt text](<img width="1920" height="1006" alt="download (1)" src="https://github.com/user-attachments/assets/c1219da4-0caa-47f3-8368-b812305457cd" />)
**Ảnh 2 – Giao diện tư vấn viên (Human-in-the-loop):** Hiển thị hồ sơ khẩn cấp, bằng chứng, độ chắc và lịch sử hành động của AI. Áp dụng HAX G10 (chuyển người khi không chắc chắn) và PAIR User Control. Mức tự chủ: AI tự soạn hồ sơ và chuyển nhân viên; quyền nhả giao dịch thuộc tư vấn viên.
 ###  Quyết định thiết kế

**Phương án nhóm chọn:**
- Hiển thị độ chắc, bằng chứng và trạng thái tool để người dùng biết AI đã làm gì.
- Cho phép người dùng sửa khi AI hiểu sai hoặc yêu cầu chuyển tư vấn viên.
- AI chỉ thực hiện các thao tác được phép; hành động quan trọng như `nha_giao_dich` cần tư vấn viên quyết định.

**Phương án đã cân nhắc:**
- **Chỉ hiển thị câu trả lời AI:** Giao diện đơn giản nhưng thiếu minh bạch, người dùng khó biết hành động nào đã thực hiện.
- **Cho AI tự xử lý toàn bộ:** Nhanh hơn nhưng rủi ro mất tiền nếu AI nhận diện sai S01.

**Lý do lựa chọn:** Nhóm ưu tiên an toàn, minh bạch và quyền kiểm soát của con người. Cách thiết kế này giúp hạn chế sai sót nghiêm trọng trong S01, S08, đồng thời vẫn hỗ trợ nhanh các trường hợp hợp lệ như S03.

## §6. Tốt là gì (chặng 6 — có thể bỏ nếu thiếu giờ)

- Viết 3 tiêu chí Pass/Fail chấm được.
- Đánh giá thiết kế của nhóm trên 2 kịch bản đắt nhất.
- Ghi rõ lỗi còn lại.

## §7. Demo

- Ca lạ nhận được khi demo.
- Prototype đã xử lý thế nào.
- Nhóm có đổi quyết định nào sau ca đó không.
