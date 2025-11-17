# Kế Hoạch Triển Khai: Tính Năng Tóm Tắt Comment YouTube

## 🎯 Mục Tiêu

Triển khai tính năng lấy và tóm tắt **50 comments + tối đa 10 replies/comment** từ YouTube, phân loại sentiment và liệt kê ý kiến nổi bật, hiển thị qua custom action result.

---

## 📊 Thông Số Kỹ Thuật

- **Số lượng**: 50 comments + 10 replies/comment
- **Total items**: ~500 items
- **Estimated tokens**: ~8,000 tokens (sau khi clean)
- **Fetch time**: ~5-8 giây
- **Display**: Custom action result (không cần tab riêng)

---

## 🏗️ Kiến Trúc Tổng Quan

```
User Click "Comments" Button
    ↓
ActionButtons.svelte
    ↓
summaryStore.fetchCommentSummary()
    ↓
youtube-comments.content.js (fetch data)
    ↓
Clean & Format Data
    ↓
api.summarizeContent('commentAnalysis')
    ↓
AI Analysis (streaming/non-streaming)
    ↓
Display in GenericSummaryDisplay
```

---

## 📁 Cấu Trúc Dữ Liệu

### Input (từ content script):

```json
{
  "success": true,
  "comments": [
    {
      "index": 1,
      "commentId": "xxx",
      "author": {
        "name": "@username",
        "channelId": "UCxxx",
        "thumbnail": "https://...",
        "isChannelOwner": false
      },
      "text": "comment content",
      "publishedTime": "1 day ago",
      "likeCount": "123",
      "replyCount": 5,
      "replies": [
        {
          "index": 1,
          "commentId": "yyy",
          "author": { ... },
          "text": "reply content",
          "publishedTime": "1 day ago",
          "likeCount": "5",
          "replyCount": 0
        }
      ]
    }
  ],
  "metadata": {
    "totalComments": 50,
    "totalReplies": 150,
    "videoId": "xxx",
    "fetchedAt": "2025-01-17T..."
  }
}
```

### Output (sau khi clean):

```
## Comment Analysis Request

**Video**: [Video ID]
**Total Comments**: 50
**Total Replies**: 150

---

### Comment 1
**Author**: @username (👤 Channel Owner)
**Published**: 1 day ago | **Likes**: 123
**Text**: "comment content here..."

**Replies** (5):
1. @user1: "reply text..."
2. @user2: "reply text..."

---

### Comment 2
...
```

---

## 🔧 Chi Tiết Các Bước

### **BƯỚC 1: Content Script - Lấy Comments**

**File**: `src/entrypoints/youtube-comments.content.js`

**Chức năng**:

- Sử dụng WXT `defineContentScript` pattern
- Set `world: 'MAIN'` để access `window.ytInitialData`
- Tích hợp logic từ `youtube-comment-fetcher.js`
- Export function `fetchComments(maxComments, maxRepliesPerComment)`

**Logic chính**:

```
1. Lấy YouTube config (API key, client info)
2. Get initial continuation token (3-step process)
3. Fetch comments với pagination (20 comments/page)
4. Parse comment data (legacy + new format)
5. Fetch replies cho mỗi comment (nếu có)
6. Limit replies đúng maxRepliesPerComment
7. Return JSON structure như spec
```

**Message listener**:

```javascript
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchYouTubeComments') {
    // Async fetch và return result
  }
})
```

---

### **BƯỚC 2: Xử Lý & Làm Sạch Dữ Liệu**

**File**: `src/stores/summaryStore.svelte.js`

**Function**: `formatCommentsForAI(comments, metadata)`

**Logic clean data**:

```
1. Loại bỏ thông tin không cần thiết:
   - commentId (không quan trọng cho analysis)
   - thumbnail URLs
   - channelId (giữ tên author thôi)

2. Format text:
   - Trim whitespace
   - Loại bỏ emoji spam (>5 emoji liên tiếp)
   - Normalize line breaks
   - Truncate comments quá dài (>500 chars)

3. Structure theo format dễ đọc:
   - Header: Video info + metadata
   - Section per comment:
     * Author (+ badge nếu channel owner)
     * Timestamp + Likes
     * Text content
     * Replies (nếu có)
   - Separator giữa các comments

4. Tối ưu tokens:
   - Loại bỏ comments duplicate
   - Giới hạn reply text (200 chars)
   - Skip comments spam (same text repeated)
```

**Output**: String markdown-formatted, clean, structured

---

### **BƯỚC 3: Prompt Template**

**File**: `src/lib/prompts/commentAnalysisPromptTemplate.js`

**Cấu trúc**:

```javascript
export const commentAnalysisPromptTemplate = `
Analyze the YouTube video comments below and provide:

1. **Sentiment Distribution** (%)
2. **Key Themes** (5-7 main topics)
3. **Notable Insights** (top comments, questions, concerns)
4. **Reply Quality** (constructive vs. spam)

Use __FORMAT__ and output in __LANG__.

---

__CONTENT__
`
```

**Placeholders**:

- `__CONTENT__`: Cleaned comment data
- `__LANG__`: Summary language
- `__FORMAT__`: Output format (markdown/bullet)

---

### **BƯỚC 4: System Instruction**

**File**: `src/lib/prompting/systemInstructions.js`

**Thêm**:

```javascript
export const systemInstructions = {
  // ... existing
  commentAnalysis: `You are an expert in social media sentiment analysis.
Analyze YouTube comments objectively.
Focus on: sentiment distribution, key themes, notable opinions.
Output must be concise, structured, and actionable.
Ignore spam and focus on meaningful discussions.`,
}
```

---

### **BƯỚC 5: Action Button**

**File**: `src/components/buttons/ActionButtons.svelte`

**Thêm vào `actions` array**:

```javascript
{
  key: 'comments',
  label: 'Comments',
  icon: 'heroicons:chat-bubble-bottom-center-text-16-solid',
  description: 'Analyze YouTube comments sentiment',
  showOnlyForYouTube: true
}
```

**Update `handleActionClick()`**:

```javascript
if (actionType === 'comments') {
  await fetchCommentSummary()
}
```

**Import**:

```javascript
import { fetchCommentSummary } from '@/stores/summaryStore.svelte.js'
```

---

### **BƯỚC 6: Summary Store Handler**

**File**: `src/stores/summaryStore.svelte.js`

**Function**: `fetchCommentSummary()`

**Logic**:

```
1. Load settings
2. Reset custom action state
3. Verify YouTube page
4. Check Firefox permissions (if needed)
5. Send message to content script:
   {
     action: 'fetchYouTubeComments',
     maxComments: 50,
     maxRepliesPerComment: 10
   }
6. Receive response: { success, comments, metadata }
7. Clean & format data: formatCommentsForAI()
8. Check streaming support
9. Call summarizeContent(formattedData, 'commentAnalysis')
10. Stream hoặc non-stream result vào customActionResult
11. Update page info
12. Log to history
```

**Error handling**:

- Video không có comments
- Content script timeout
- AI API errors
- Permission denied (Firefox)

**Export**:

```javascript
export { fetchCommentSummary }
```

---

### **BƯỚC 7: API & Prompt Builder**

**File**: `src/lib/api/api.js`

**Update `customActionTypes`**:

```javascript
const customActionTypes = ['analyze', 'explain', 'debate', 'commentAnalysis']
```

**File**: `src/lib/prompting/promptBuilders.js`

**Thêm builder**:

```javascript
commentAnalysis: {
  buildPrompt: (text, lang, length, format, tone) => {
    const systemInstruction = systemInstructions.commentAnalysis
    let userPrompt = commentAnalysisPromptTemplate

    userPrompt = replacePlaceholders(userPrompt, lang, length, format, tone)
    userPrompt = userPrompt
      .replace(/__CONTENT__/g, text)
      .replace(/__LANG__/g, lang)

    return { systemInstruction, userPrompt }
  }
}
```

---

## 🎨 UI/UX Flow

```
1. User vào YouTube video page
2. Click "Summarize" button
3. ActionButtons xuất hiện (bao gồm "Comments")
4. Click "Comments" button
5. Loading state:
   - "Fetching comments..." (0-5s)
   - "Analyzing comments..." (5-15s)
6. Display result:
   ┌─────────────────────────────────────┐
   │ 📊 Comment Analysis                 │
   ├─────────────────────────────────────┤
   │ **Sentiment Distribution**          │
   │ ✅ Positive: 65%                    │
   │ ⚪ Neutral: 25%                     │
   │ ❌ Negative: 10%                    │
   │                                     │
   │ **Key Themes**                      │
   │ 1. Video quality praised            │
   │ 2. Tutorial requests                │
   │ ...                                 │
   │                                     │
   │ **Notable Insights**                │
   │ - Most liked: "Great video!"        │
   │ - Common question: "Part 2?"        │
   └─────────────────────────────────────┘
7. Có thể save to archive
```

---

## ⚠️ Error Handling

### Các trường hợp cần xử lý:

1. **Video tắt comment**:

   - Error message: "Comments are disabled for this video"
   - Detect: continuation token null

2. **Không có comment nào**:

   - Error message: "No comments available yet"
   - Detect: comments array empty

3. **Content script timeout**:

   - Retry mechanism với exponential backoff
   - Fallback message sau 15s

4. **Rate limiting**:

   - YouTube API có giới hạn
   - Implement caching (5 phút)
   - Show "Please try again later"

5. **Network errors**:

   - Retry 3 lần với delay
   - Clear error message cho user

6. **AI API errors**:
   - Fallback to non-streaming
   - Show error với suggestion

---

## 🧪 Test Cases

### Test 1: Video có >50 comments

- **Expected**: Lấy đúng 50 comments đầu
- **Verify**: metadata.totalComments === 50

### Test 2: Video có <50 comments (ví dụ: 30)

- **Expected**: Lấy tất cả 30 comments
- **Verify**: metadata.totalComments === 30

### Test 3: Video tắt comment

- **Expected**: Error message rõ ràng
- **Verify**: customActionError.message === "Comments disabled"

### Test 4: Comment có >10 replies

- **Expected**: Lấy 10 replies đầu
- **Verify**: comment.replies.length === 10

### Test 5: Streaming vs Non-streaming

- **Expected**: Cả 2 modes hoạt động
- **Verify**: Output giống nhau

### Test 6: Data cleaning

- **Expected**: Không có emoji spam, text truncate đúng
- **Verify**: Manual check formatted output

### Test 7: Multiple languages

- **Expected**: Support tiếng Việt, English, Korean, etc.
- **Verify**: AI output đúng ngôn ngữ

---

## 📦 Files Cần Tạo/Sửa

### **TẠO MỚI** (2 files):

1. `src/entrypoints/youtube-comments.content.js`
2. `src/lib/prompts/commentAnalysisPromptTemplate.js`

### **CHỈNH SỬA** (5 files):

1. `src/components/buttons/ActionButtons.svelte`

   - Thêm action "comments"
   - Import fetchCommentSummary

2. `src/stores/summaryStore.svelte.js`

   - Thêm fetchCommentSummary()
   - Thêm formatCommentsForAI()
   - Export functions

3. `src/lib/api/api.js`

   - Update customActionTypes array

4. `src/lib/prompting/promptBuilders.js`

   - Thêm commentAnalysis builder
   - Import commentAnalysisPromptTemplate

5. `src/lib/prompting/systemInstructions.js`
   - Thêm commentAnalysis instruction

---

## 🚀 Quy Trình Triển Khai

### Phase 1: Core (Ưu tiên cao)

1. ✅ Tạo content script với logic lấy comments
2. ✅ Implement data cleaning function
3. ✅ Tạo prompt template

### Phase 2: Integration

4. ✅ Thêm action button
5. ✅ Implement fetchCommentSummary()
6. ✅ Connect API handlers

### Phase 3: Testing & Polish

7. ✅ Test cases
8. ✅ Error handling
9. ✅ Performance optimization

---

## 💡 Lưu Ý Quan Trọng

### Data Cleaning Priority:

1. **Loại bỏ noise**: emoji spam, duplicate text
2. **Truncate dài**: Giới hạn comment 500 chars, reply 200 chars
3. **Format nhất quán**: Markdown structure rõ ràng
4. **Metadata có ý nghĩa**: Total counts, video ID, timestamp

### Performance:

- Content script: ~5s (network dependent)
- Data cleaning: <100ms
- AI processing: ~10-20s (streaming) / ~15-30s (non-streaming)
- Total: ~15-35s

### Token Optimization:

- Raw data: ~30,000 tokens
- After cleaning: ~8,000 tokens (73% reduction)
- Fits all providers (Gemini 128K, GPT-4 32K)

---

## 🎓 Best Practices

1. **Content Script**:

   - Use `world: 'MAIN'` cho YouTube API access
   - Implement pagination correctly
   - Handle edge cases (no comments, disabled)

2. **Data Cleaning**:

   - Clean TRƯỚC KHI gửi AI (giảm tokens)
   - Keep meaningful metadata
   - Format readable cho AI

3. **Error Handling**:

   - User-friendly messages
   - Retry mechanisms
   - Fallback options

4. **Performance**:
   - Cache results (5 mins)
   - Stream when possible
   - Optimize token usage

---

## 📝 Checklist Trước Khi Triển Khai

- [ ] Đã review cấu trúc dữ liệu input/output
- [ ] Đã hiểu logic 3-step fetch continuation
- [ ] Đã xác định data cleaning rules
- [ ] Đã review prompt template
- [ ] Đã check WXT content script pattern
- [ ] Đã hiểu message flow (content → store → API)
- [ ] Đã chuẩn bị test cases

---

**Kế hoạch này ready để bắt đầu triển khai trong session Code mode.**

**Ước tính thời gian**: 1-2 giờ implementation + testing
