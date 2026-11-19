# Grammar N5: báo cáo rà soát chất lượng

Phạm vi: 81 mẫu và 242 câu ví dụ của N5 (nguồn OpenJLPT, bản dịch tiếng Việt do VocaPet soạn).
**Không mục nào được đổi sang `reviewed`.** Mọi mục vẫn là `draft`; người biết tiếng Nhật cần duyệt.

## 1. Cách rà soát (và giới hạn)

- Người rà soát là chính bên đã soạn bản nháp, nên đây không phải kiểm duyệt độc lập.
- Kiểm tra tự động (`tools/grammarCheck.ts`):
  - 81/81 mẫu có nghĩa, giải thích, ghi chú; 242/242 câu có bản dịch, số câu khớp nguồn.
  - Furigana: 607 đoạn `{kanji|kana}`; văn bản khớp câu gốc; mọi đoạn là kanji + hiragana.
    Với kanji đơn, âm đọc khớp KANJIDIC2 on/kun, trừ 分→ぷん (đúng: biến âm của 分 khi đếm phút).
    Đoạn ghép nhiều kanji chưa được đối chiếu tự động.
  - Số trong câu Nhật có trong câu dịch; không còn token cấu trúc tiếng Anh chưa dịch.
- Rà thủ công từng mục: nghĩa, giải thích, ghi chú đối chiếu với `notes` của nguồn.

## 2. Lỗi tìm thấy và đã sửa (trong `vi/n5.json`, nguồn không đổi)

| Mục | Vấn đề | Xử lý |
|---|---|---|
| `masu` | Nghĩa ghi "(đuôi động từ lịch sự, hiện tại/tương lai) làm", khó hiểu | "đuôi động từ lịch sự (hiện tại, tương lai)" |
| `ka-question` | Gọi か là "từ để hỏi" (nhầm với từ nghi vấn như 何, だれ) | "trợ từ nghi vấn cuối câu" |
| `ni-suru` | Câu 旅行は来月にしましょう dịch lệch ("mình dự định") | "Hãy để chuyến đi vào tháng sau nhé." |
| 22 mẫu có chú thích tiếng Anh trong mẫu câu, ví dụ `〜に（time）` | Tiêu đề hiển thị tiếng Anh | Thêm `qualifierVi` ("thời gian", "điểm đến"…); romaji bỏ phần ngoặc. Nguồn giữ nguyên. |
| Mẫu dễ nhầm | Nguồn không có trường liên quan; chỉ 5 `notes` nhắc mẫu khác | Thêm `related` (58 mẫu, 80 liên kết), dựa trên các cặp mà nguồn tự đối chiếu (は/が, に/へ, に/で, と/や/か, ね/よ, たい/ほしい, まだ/もう, あまり/全然, くらい/ごろ, 前に/後で…) và các dạng anh em (ます/ません/ました). Đây là nội dung biên tập, cần duyệt. |

Số câu ví dụ đã sửa: **1** (`ni-suru`, câu 3). Số câu cần người duyệt đọc kỹ: xem mục 3.

## 3. Cần người biết tiếng Nhật duyệt

- Sắc thái của よ ("đấy, nhé"), ね ("nhỉ"), でしょう, もう/まだ, 〜ている (3 nghĩa) trong bản dịch ví dụ.
- Giải thích ngắn (`explanationVi`) viết lại từ `formation` và `notes` của nguồn; chưa có nguồn thứ hai để đối chiếu.
- Tính tự nhiên của câu ví dụ gốc: chỉ xem mẫu, chưa đọc đủ 242 câu.
- Các cặp `related`: chọn theo nguồn và kinh nghiệm chung, chưa kiểm với giáo trình.

## 4. Số liệu

| | Số |
|---|---|
| Mẫu đã kiểm duyệt (`reviewed`) | **0** |
| Mẫu còn nháp (`draft`) | **81** |
| Câu ví dụ đã sửa | 1 / 242 |
| Mẫu có `related` | 58 / 81 |

## 5. Giao diện: lỗi đã xử lý

Kiểm tra bằng trình duyệt thật (dev server riêng + API giả cục bộ, không đụng backend thật) ở 1366×900, 768×1024, 375×812.

- Tiêu đề thẻ hiện tiếng Anh `〜に（time）` → đã thay bằng tiếng Việt, chú thích dùng font thường, nhỏ hơn.
- Mỗi thẻ có nhãn "Nháp" gây rối → một dòng lưu ý duy nhất trên đầu danh sách, nhãn "Bản dịch nháp" ở trang chi tiết.
- Mobile: ba hàng chip chiếm cả màn hình đầu → hàng cuộn ngang một dòng.
- Chi tiết: ba mục "Chưa có dữ liệu" liên tiếp → gộp thành "Mẫu dễ nhầm và liên quan"; mục cùng chủ đề chỉ hiện khi có.
- Thêm nút "Mẫu trước / Mẫu sau" cuối trang chi tiết.
- Bộ lọc tiến độ lưu trên URL (`?status=`), nên tải lại hoặc quay lại không mất.
- Romaji hiển thị `ni (time)` → `ni`.

Responsive: desktop (3 cột thẻ), tablet (2 cột, chi tiết một cột), mobile (1 cột, chip cuộn ngang) đều đọc được; không có tràn ngang.
Đã xem: danh sách, chi tiết, tìm kiếm, trạng thái N4 rỗng, đã học + tải lại. Chưa tái hiện được trạng thái lỗi tải (cần ép lỗi mạng) và trạng thái loading chỉ thấy thoáng qua.

## 6. Tìm kiếm

- Có dấu và không dấu cho cùng kết quả ("lý do" = "ly do"); mẫu câu có hoặc không có 〜; kana, romaji, cấu trúc, từ khóa, tiếng Anh (không hiển thị).
- Chống nhiễu: một chữ Latin không trả gì; chữ Latin khớp theo đầu từ, không khớp giữa từ; tiếng Nhật một chữ chỉ tìm trong mẫu và cách đọc (không tìm trong câu ví dụ); xếp hạng theo trường (mẫu > romaji > nghĩa Việt > cấu trúc > từ khóa > tiếng Anh); cụm từ liền kề được cộng điểm.
- "ni" → 9 mẫu (họ 〜に), "て" → 12, "wa" → 4.

## 7. Học tập

- Đã học, Yêu thích, lọc Chưa học / Đã học / Yêu thích, lưu `localStorage` (khóa `vocapet.grammar.marks.v1` giữ nguyên).
- Dữ liệu cũ không mất: đã thử dữ liệu có sẵn `{"learned":["wa"],"favorite":["ne"],"future":{"x":1}}`; bật đã học `te-iru` giữ nguyên các mục khác kể cả trường lạ. Dữ liệu hỏng hoặc sai kiểu được bỏ qua, không làm vỡ trang.

## 8. Chưa làm

- Ôn tập, quiz, so sánh mẫu dễ nhầm (bạn đã nói không cần ở bản đầu).
- Duyệt nội dung (cần người).
- Đánh dấu đã học ngay trên thẻ danh sách (thẻ là liên kết; cần thiết kế riêng).
- Chưa mở rộng N4.
