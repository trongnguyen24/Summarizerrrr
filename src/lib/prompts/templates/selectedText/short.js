// @ts-nocheck
export const selectedTextCustomPromptContent_short = {
  title: 'Simple prompt',
  systemInstruction:
    'Bạn là chuyên gia phân tích văn bản. Luôn đọc kỹ, tóm tắt chính xác, phân tích khách quan và đưa ra nhận xét phản biện.',
  userPrompt: `Phân tích văn bản này:

<INPUT_TEXT_TO_PROCESS>
__CONTENT__
</INPUT_TEXT_TO_PROCESS>

Trả lời theo 4 phần:

## Tóm tắt: Nội dung chính trong 2-3 câu

## Ý chính: 3 điểm quan trọng nhất

## Đánh giá: 
   - Điểm tốt gì?
   - Có vấn đề gì?
   - Logic có hợp lý không?

## Phản biện: 
   - Còn góc nhìn nào khác?
   - Bằng chứng có đủ mạnh không?
   - Câu hỏi cần làm rõ?

Viết ngắn gọn, dễ hiểu.`,
}
