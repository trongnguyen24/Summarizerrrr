# Auto-chunking / Map-Reduce Summarization — V1

> **How to use this doc:** Self-contained execution plan, intended to be run in
> a fresh session. Start at Phase 1 and go in order. Each phase ends with a
> verify step — don't move on until it passes. Run `npm test` and `npm run check`
> as you go; they include the architecture guard that enforces the layering
> rules this plan depends on.

## Context

Summarizerrrr hiện nhồi **toàn bộ** nội dung (web page hoặc transcript YouTube
dài 2–3 tiếng) vào **một** prompt và gửi trong **một** API request duy nhất,
không có bất kỳ kiểm tra độ dài/token nào. Với các free-tier bị giới hạn TPM
(Tokens Per Minute) / payload size (Groq, Cerebras, OpenRouter) hoặc local model
bị `num_ctx` nhỏ (Ollama, LM Studio mặc định 2048–4096), request lớn bị từ chối
ngay (HTTP 413 Payload Too Large / 429 TPM) hoặc làm model crash.

Mục tiêu: khi nội dung vượt ngưỡng an toàn, tự động **chia nhỏ (chunk)** → tóm
tắt từng phần (**Map**) → tổng hợp thành bản cuối (**Reduce**), giữ nguyên
ngôn ngữ/tone/length/format người dùng cấu hình, và với YouTube giữ được
timestamp `[mm:ss]`.

**Hiện trạng đã xác minh trên code (điểm bắt đầu cho executor):**

- Luồng summarize: `getPageContent()` ([src/services/contentService.js:153](../src/services/contentService.js#L153),
  check duy nhất là sàn `length >= 50`, không có trần) → `__CONTENT__` replace
  ([src/lib/prompts/builders/index.js:47](../src/lib/prompts/builders/index.js#L47))
  → `summarizeContent(text, contentType, abortSignal)`
  ([src/lib/api/api.js:91](../src/lib/api/api.js#L91)) → 1 lần
  `aiSdkGenerateContent(...)` → `generateText()`
  ([src/lib/api/aiSdkAdapter.js:395](../src/lib/api/aiSdkAdapter.js#L395)).
  **Không có chunking/token-check ở bất kỳ đâu trong luồng này.**
- Entry point UI: `fetchAndSummarize()` trong
  [src/stores/summaryStore.svelte.js:225](../src/stores/summaryStore.svelte.js#L225),
  **hardwired blocking** (`shouldUseStreaming = false`, dòng 317). 3 nhánh gọi
  `summarizeContent()`: youtube (~dòng 406), course (~430), general (~448).
  Progress hiện chỉ có `modelStatus` + boolean loading flags — **không có
  step/percentage indicator**.
- **Token estimator ĐÃ TỒN TẠI — tái sử dụng, đừng viết mới:** `estimateTokens()`
  tại [src/lib/chat/contextPipeline/contextBudgeter.js:54](../src/lib/chat/contextPipeline/contextBudgeter.js#L54)
  (heuristic CJK=1, Latin có dấu=1.5, default=4 chars/token, cố tình không dùng
  tokenizer nặng). Đây là tầng `lib` → import từ `src/lib/api/` hợp lệ.
- Fallback hiện có ([src/lib/utils/geminiAutoFallback.js](../src/lib/utils/geminiAutoFallback.js))
  **chỉ cho Gemini**, phản ứng 503/429/404 bằng đổi model/key —
  **không** xử lý 413/oversized input. `simpleErrorHandler.js`
  ([src/lib/error/simpleErrorHandler.js:29](../src/lib/error/simpleErrorHandler.js#L29))
  không đọc status code (`canRetry` hardcode `true`). → adaptive-retry là net-new.

**Ràng buộc layering (CLAUDE.md, guard bởi `tests/architecture/layering.test.js`):**
`src/lib/**` chỉ được import `src/lib/**`. Module mới đặt ở `src/lib/api/`.
`lib` **không được** import store → progress phải dùng **callback truyền từ store
xuống**, không import `summaryStore` vào `lib`. Đọc settings trong `lib` qua
`settings` từ `src/lib/config/settingsPort.js` (không import store trực tiếp).

### Goal & scope decision (confirmed with user)

- **Phạm vi V1 (đã chốt):** Core map-reduce engine · Progress UI · Adaptive
  retry 413/429 · Settings toggle. Cả 4 đều nằm trong V1.
- **Streaming: giữ blocking như hiện tại.** KHÔNG stream ở Reduce phase (tránh
  xung đột với thiết kế atomic per-tab commit `shouldUseStreaming = false`). UI
  chỉ hiện loading theo bước.
- **Không viết token estimator mới** — tái dùng `estimateTokens` có sẵn.
- Dưới ngưỡng → giữ **nguyên hành vi cũ** (1 request, không progress).
- Không thêm dependency nặng (không `tiktoken`/tokenizer WASM).
- **Chỉ áp dụng chunk cho contentType `youtube`/`general`/`courseSummary`.** Các
  custom-action (`analyze`/`explain`/`debate`/`commentAnalysis`) và `selectedText`
  **KHÔNG** đi qua map-reduce (prompt Map/Reduce là dạng "tóm tắt", sẽ làm sai
  ngữ nghĩa debate/explain) — xem B2 dưới đây.
- **Ngưỡng chunk lấy từ context window của model đã resolve, không phải hằng số
  phẳng** — tránh chunk oan provider context lớn (Gemini 1M, Claude 200k). Xem B3.

### Rủi ro đã biết từ review (phải xử lý trong các phase, không bỏ qua)

- **B1 — Abort/cancellation:** 3 lời gọi `summarizeContent()` hiện KHÔNG truyền
  `abortSignal` ([summaryStore.svelte.js:406/430/448](../src/stores/summaryStore.svelte.js#L406)).
  Map-reduce bắn 20–40+ request tuần tự → khi user cancel/re-summarize
  (`resetLocalState()` ~dòng 256) loop vẫn chạy nền. **Phải wire `AbortController`
  xuyên suốt** (Phase 3).
- **B2 — Custom-action misrouting:** nhánh chunk phải gate theo contentType (chốt ở trên).
- **B3 — Over-eager chunking:** ngưỡng phải derive từ model context window.
- **G1 — Partial failure giữa Map:** per-chunk retry + fallback "reduce phần đã có".
- **G2 — Reduce tự vượt budget:** reduce phân cấp theo batch khi partials lớn.
- **G3 — `summarizeChapters()` vẫn hỏng:** đây là fix **một phần**; chapters của
  đúng video dài đó vẫn nện full transcript ([summaryStore.svelte.js:582](../src/stores/summaryStore.svelte.js#L582), [api.js:364](../src/lib/api/api.js#L364)). Nêu rõ, đừng quảng cáo "video dài giờ chạy ổn".
- **G4 — Progress cho floating/shadow UI:** phải wire qua `i18nShadowStore` (kênh
  locale riêng của Shadow DOM), không chỉ `src/lib/i18n/`.
- **G5 — Gate token bỏ sót system:** `estimatePromptTokens` phải cộng cả
  `systemInstruction` (bỏ sót là under-estimate hướng nguy hiểm).

---

## Phase 1 — Chunking + token estimation module

**Tạo `src/lib/api/contentChunker.js`** (tầng `lib`):

- `import { estimateTokens } from '@/lib/chat/contextPipeline/contextBudgeter.js'` — tái sử dụng, **không** viết estimator mới.
- `estimatePromptTokens({ userPrompt, systemInstruction })` — `estimateTokens(userPrompt) + estimateTokens(systemInstruction)` + margin cho message wrapper. **Phải gồm cả system** (G5).
- `splitText(text, maxTokens, overlapTokens)` — cắt theo ranh giới ngữ nghĩa ưu
  tiên giảm dần: `\n\n` (paragraph) → heading (`#`/`##`) → câu (`. ? !`). Không
  cắt ngang từ. Chèn overlap ~10–15% (giới hạn bởi `overlapTokens`) ở đầu mỗi
  chunk để giữ ngữ cảnh liền mạch.
- `splitTimestampedTranscript(text, maxTokens)` — nhận dạng dòng có mốc
  `[hh:mm:ss]` hoặc `[mm:ss]`, gom theo dòng sao cho mỗi chunk ≤ `maxTokens`,
  **không tách ngang một dòng timestamp**. Mỗi chunk giữ mốc bắt đầu.
- Hằng số: `SAFETY_MARGIN = 0.85`, `OVERLAP_FRACTION = 0.12`,
  `FALLBACK_CTX_TOKENS = 6000` (chỉ dùng khi không biết context window của model).
- `resolveChunkThreshold(resolvedSettings, autoChunkSize)` — nếu `autoChunkSize`
  là số → dùng raw (đã chuẩn hoá, không nhân margin); nếu `'auto'` → lấy context
  window của model đã resolve (từ config provider/`resolvedSettings`) `* SAFETY_MARGIN`,
  else `FALLBACK_CTX_TOKENS * SAFETY_MARGIN`. **Không dùng hằng số phẳng** (B3).
- Export `isTimestamped(contentType)` helper (`contentType === 'youtube'`) để
  điểm gọi chọn splitter phù hợp.

**Tạo `tests/lib/api/contentChunker.test.js`** — kiểm: split đúng ranh giới ưu
tiên, giữ nguyên dòng timestamp, có overlap, và các edge case (text rỗng, đúng 1
chunk, đúng ngưỡng, transcript không có timestamp rơi về `splitText`).

**Verify:** `npx vitest run tests/lib/api/contentChunker.test.js` pass; `npm run check` không lỗi type ở file mới.

## Phase 2 — Map-Reduce orchestration + tích hợp vào luồng summarize

**Thêm builder cho Map/Reduce trong `src/lib/prompts/builders/`** (cạnh
`index.js`): `buildMapChunkPrompt(chunk, lang, contentType)` (prompt ngắn trích
key points; nếu `youtube` giữ mốc `[mm:ss]`) và `buildReduceSummaryPrompt(partials, lang, length, tone, contentType)`
(gom partials → bản cuối theo đúng lang/tone/length/format, tái dùng
`replacePlaceholders` + module tone/length/format hiện có; nếu `youtube` thêm
constraint *"Preserve the original time markers `[mm:ss]`"*).

**Tạo `src/lib/api/mapReduceSummarizer.js`** (tầng `lib`):

- `summarizeWithMapReduce({ text, contentType, lang, length, tone, generate, onProgress, abortSignal, chunkTokens })`.
- **Map:** chọn splitter theo `isTimestamped(contentType)`, chạy **tuần tự**
  (concurrency 1) với delay ~500ms giữa các request (né RPM). Mỗi chunk →
  `buildMapChunkPrompt` → `generate(...)`. Gọi `onProgress?.({ phase:'map', current, total })` sau mỗi chunk. **Kiểm `abortSignal.aborted` trước mỗi chunk** và ném ngay nếu đã abort (B1).
- **Per-chunk retry (G1):** mỗi chunk retry tối đa 2 lần (backoff nhỏ) khi lỗi
  transient (429/5xx). Nếu một chunk fail hẳn → không vứt toàn bộ: gom các
  partial đã thành công và đi tiếp tới Reduce (fallback "reduce phần đã có"),
  ghi chú phần thiếu.
- **Reduce (G2 — phân cấp):** nếu tổng token của partials vẫn vượt `chunkTokens`
  → reduce theo **batch** (gom nhóm partials → reduce từng nhóm → lặp) cho tới
  khi còn 1 lần `generate` cuối. Gọi `onProgress?.({ phase:'reduce' })`. Trả bản Markdown cuối.
- `generate` là closure do `api.js` cấp (đóng gói provider/settings), giữ
  `mapReduceSummarizer` không phụ thuộc adapter cụ thể.

**Sửa `src/lib/api/api.js` — `summarizeContent()`:**

- Đổi signature → `summarizeContent(text, contentType, abortSignal = null, onProgress = null)`.
- **Gate contentType (B2):** chỉ xét chunk khi `contentType ∈ { 'youtube', 'general', 'courseSummary' }`.
  Các custom-action (`analyze/explain/debate/commentAnalysis`) và `selectedText`
  **luôn** đi đường một-lần cũ (prompt Map/Reduce dạng tóm tắt sẽ sai ngữ nghĩa).
- Sau khi build `systemInstruction`/`userPrompt`, thêm nhánh: nếu contentType hợp
  lệ **và** `settings.autoChunkEnabled` **và**
  `estimatePromptTokens({ userPrompt, systemInstruction }) > resolveChunkThreshold(resolvedSettings, settings.autoChunkSize)` (G5 + B3)
  → gọi `summarizeWithMapReduce({ ..., chunkTokens: threshold, generate: (sys, usr) => aiSdkGenerateContent(providerId, resolvedSettings, sys, usr, { abortSignal, ...reasoningOptions }), onProgress })`.
- Ngược lại → **giữ nguyên** đường `aiSdkGenerateContent` một-lần (không đổi hành vi).

**Verify:** `npm test` pass toàn bộ (gồm `tests/architecture/layering.test.js` —
xác nhận module mới ở `lib` không import store/services); `npm run check` sạch.

## Phase 3 — Progress UI (blocking, theo bước)

**`src/stores/summaryStore.svelte.js`:**

- Thêm `summaryProgress: { phase: null, current: 0, total: 0 }` vào `summaryState`
  và reset nó trong hàm reset state (cạnh chỗ reset `modelStatus`, ~dòng 287).
- **Abort wiring (B1):** tạo/giữ một `AbortController` cho lần summarize, truyền
  `controller.signal` vào **cả 3** lời gọi `summarizeContent(...)`
  (youtube/course/general — hiện đang gọi 2 tham số ở dòng 406/430/448). Gọi
  `controller.abort()` trong `resetLocalState()` (~dòng 256) để cancel/re-summarize
  dừng được vòng lặp map-reduce. Xử lý `AbortError` như hủy êm, không phải lỗi.
- Truyền callback `onProgress = (p) => updateState({ summaryProgress: p })` vào cả 3 lời gọi.
- **Lưu ý (G6):** `summarizeSelectedText()` / `executeCustomAction()` gọi
  `summarizeContent` với contentType custom-action → theo gate B2 chúng KHÔNG
  chunk; vẫn nên truyền abortSignal cho nhất quán nhưng không cần progress.

**UI** — tìm **consumer thực tế** của `modelStatus` ở sidepanel + popup + floating
panel; hiển thị cạnh đó: khi `summaryProgress.total > 1` → "Đang tóm tắt phần
{current}/{total}…"; khi `phase === 'reduce'` → "Đang tổng hợp bản tóm tắt cuối…".
- i18n keys mới ở `src/lib/i18n/` cho sidepanel/popup.
- **Shadow DOM floating panel (G4):** localize qua `i18nShadowStore.svelte.js`
  (kênh locale riêng của Shadow DOM, CLAUDE.md) — wire progress string qua đường
  shadow i18n, không dùng trực tiếp `src/lib/i18n/`.
- Cân nhắc suppress cập nhật `modelStatus` per-chunk để UI không nhấp nháy trong Map.

**Verify:** `npm run dev`, load `.output/chrome`; tóm tắt 1 video YouTube dài →
thấy indicator "phần k/N" rồi "tổng hợp"; tóm tắt trang ngắn → **không** thấy
indicator (total ≤ 1). `npm run check` sạch.

## Phase 4 — Adaptive retry (413/429) + Settings toggle

**Tạo `src/lib/api/payloadErrorDetection.js`** (tầng `lib`, provider-agnostic —
theo pattern kiểm `error.status`/`statusCode`/`code`/`cause.*` trong
[geminiAutoFallback.js](../src/lib/utils/geminiAutoFallback.js)):

- `isPayloadTooLargeError(e)` — 413 / "payload too large" / "request too large" / "context length" / "maximum context".
- `isRateLimitError(e)` — 429 / "rate limit" / "TPM" / "tokens per minute".

**Adaptive retry** tại điểm gọi trong `api.js`: bọc lời gọi single-shot (nhánh
dưới ngưỡng) trong try/catch — nếu bắt `isPayloadTooLargeError`/`isRateLimitError`
→ chuyển sang `summarizeWithMapReduce` với `chunkTokens` = 50% ngưỡng, và trong
map-reduce nếu vẫn lỗi thì giảm tiếp (tối đa 2 vòng) trước khi `throw`. Error
cuối cùng vẫn qua `handleError` như hiện tại.

**Settings toggle:**

- `src/stores/settingsStore.svelte.js`: thêm `autoChunkEnabled` (default `true`)
  và `autoChunkSize` (`'auto'` | number, default `'auto'`) vào schema settings
  mặc định + migration nếu có.
- Settings UI (`src/entrypoints/settings/`, cạnh nhóm cấu hình summarize): toggle
  "Auto-chunk long content" + input chunk size (chỉ hiện khi bật). Thêm i18n keys.
- `api.js` đọc 2 setting này qua `settings` từ `settingsPort` (không import store).

**Verify:** `npm test` + `npm run check` sạch. `npm run dev`: (a) tắt toggle →
video dài quay lại 1-request (dễ reproduce lỗi cũ để đối chứng); (b) ép lỗi
413/429 (đặt chunk size rất lớn hoặc dùng provider free-tier chặt) → xác nhận tự
giảm chunk và hoàn tất thay vì fail thẳng.

---

## Out of scope (V1)

- Streaming bản tóm tắt cuối (giữ blocking).
- Concurrency > 1 ở Map phase (chạy tuần tự để né RPM; song song có kiểm soát để sau).
- Tokenizer chính xác per-provider (dùng heuristic `estimateTokens` sẵn có).
- Áp dụng map-reduce cho luồng chat (`contextBudgeter` đã tự lo phần đó).
- Custom-action (`analyze/explain/debate/commentAnalysis`) + `selectedText` — không chunk (B2).
- **Map-reduce cho `summarizeChapters()`** — V1 chỉ làm `summarizeContent()`.
  **⚠️ Fix một phần (G3):** đúng video YouTube dài kích hoạt map-reduce cho *video
  summary* thì lời gọi `summarizeChapters(transcript)` ([summaryStore.svelte.js:582](../src/stores/summaryStore.svelte.js#L582), [api.js:364](../src/lib/api/api.js#L364))
  **vẫn nện full transcript** và có thể 413/429. Đừng trình bày "video dài giờ
  chạy ổn" — chapters vẫn hỏng cho tới V2.

## Final verification checklist

- [ ] `npm test` pass toàn bộ (đặc biệt `tests/architecture/layering.test.js` và test chunker mới).
- [ ] `npm run check` không lỗi type.
- [ ] `npm run dev` → trang/video **ngắn**: hành vi y hệt trước (1 request, không progress).
- [ ] Video YouTube **dài** với provider free-tier: thấy progress "phần k/N" → "tổng hợp", bản cuối đúng lang/tone và **giữ timestamp `[mm:ss]`**.
- [ ] Tắt toggle trong Settings → quay lại luồng một-request.
- [ ] Ép 413/429 → adaptive retry giảm chunk và hoàn tất.
- [ ] Nhấn cancel/re-summarize giữa lúc map-reduce chạy → vòng lặp **dừng** (B1), không còn request bắn nền.
- [ ] Nội dung dài với custom-action (`explain`/`debate`) → đi đường một-lần, KHÔNG bị map-reduce (B2).
- [ ] Video YouTube dài trên provider context lớn (Gemini) nhưng nội dung vừa → KHÔNG bị chunk oan (B3).
- [ ] Test khẳng định timestamp `[mm:ss]` sống sót qua cả Map lẫn Reduce.

## Notable files

- `src/lib/api/contentChunker.js` — **mới**: token estimate (reuse `estimateTokens`) + split text/transcript.
- `src/lib/api/mapReduceSummarizer.js` — **mới**: orchestration Map (tuần tự, delay) + Reduce.
- `src/lib/api/payloadErrorDetection.js` — **mới**: detect 413/429 provider-agnostic.
- `src/lib/prompts/builders/` — **sửa**: thêm builder `mapChunk` + `reduceSummary`.
- `src/lib/api/api.js` — **sửa**: `summarizeContent()` thêm nhánh chunk + `onProgress` + adaptive retry.
- `src/stores/summaryStore.svelte.js` — **sửa**: `summaryProgress` state + truyền `onProgress`.
- `src/stores/settingsStore.svelte.js` + `src/entrypoints/settings/` — **sửa**: setting `autoChunkEnabled`/`autoChunkSize` + UI.
- `src/lib/i18n/` — **sửa**: i18n keys cho progress + settings.
- `tests/lib/api/contentChunker.test.js` — **mới**: test chunking.
- **Tái sử dụng (không sửa):** `estimateTokens` ([contextBudgeter.js:54](../src/lib/chat/contextPipeline/contextBudgeter.js#L54)), `handleError` ([simpleErrorHandler.js:29](../src/lib/error/simpleErrorHandler.js#L29)), `settings` từ `settingsPort`, `replacePlaceholders` + tone/length/format module.
