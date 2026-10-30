# Nghiên cứu: Inline Citations cho Chat (DOM-anchored)

> Tài liệu nghiên cứu — chưa phải plan thi công. Mục tiêu: chốt hướng thiết kế cho tính năng "trích dẫn nguồn có vị trí" trong chat, và ghi lại đầy đủ context/ràng buộc để phát triển tiếp.
> Trạng thái: đang bàn luận, hội tụ về hướng **DOM-anchored inline citation + thang degrade**.
> Branch: `v3.0-NewSettingUI-2`.

---

## 1. Bối cảnh & mục tiêu

Khi chat trả lời dựa trên nội dung trang/tab, ta muốn câu trả lời **kèm trích dẫn có vị trí**: một marker (vd `[a2]`) trong câu, hover xem đoạn nguồn, click thì **cuộn/nhảy tới đúng chỗ** trong tab tương ứng.

Yêu cầu ngầm quan trọng:
- Không được **làm hỏng chất lượng tóm tắt** (ép trích dẫn mọi lúc là phản tác dụng).
- Không được **phá prompt-cache** (xem §3.6).
- Phải **chịu được** việc người dùng đóng tab / đổi trang / trang tự re-render.

## 2. Vấn đề cốt lõi (một câu)

Trích dẫn được **tạo lúc capture** (trỏ vào một node DOM trong một tab cụ thể), nhưng **click lúc sau** — khi trạng thái tab có thể đã đổi. Đồng thời **câu trả lời được persist** (IndexedDB), nên anchor runtime-only sẽ thành **link chết** khi mở lại conversation. Đây là *đúng lớp vòng đời* mà dự án đã ghi nhận: "URL alone can't reopen a chat; tabId is runtime-only."

## 3. Trạng thái hiện tại (kiến trúc liên quan)

### 3.1 Context pipeline
`src/lib/chat/contextPipeline/`: `sourceResolver → contextBudgeter → contextAssembler`, điều phối bởi `index.js#buildContextPipeline()`.
- Nguồn được nạp như **user-role message** (không nằm trong system prompt), bọc bởi `sourceFormatter.js#formatSource()`:
  ```
  [[UNTRUSTED_SOURCE id="…" type="…" capturedAt="…"]]
  title: …
  normalizedUrl: …
  content:
  <body>
  [[/UNTRUSTED_SOURCE]]
  ```
- `escapeSourceValue()` vô hiệu hoá `[[`, `]]`, `---` đầu dòng để nguồn không giả mạo wrapper (chống prompt-injection).

### 3.2 Source data model — **blob phẳng, không có địa chỉ**
`src/services/chat/chatSourceService.js#persistSnapshot()` lưu `{ rawContent: <toàn bộ text>, condensedContent, contentHash, sourceType, title, normalizedUrl, capturedAt, … }`.
- **Không** có paragraph-id, char-offset, section-anchor, hay cấu trúc cây. → Muốn trích dẫn *cấp vị trí* thì phải **thêm cấu trúc** lúc capture/format.
- Cấu trúc vị trí *duy nhất* đang tồn tại: **timestamp `[MM:SS]`** trong transcript YouTube/course, được skill `chapter-summary` yêu cầu giữ lại.

### 3.3 `groundingRefs` — trích dẫn **cấp tài liệu** (đã có)
- `contextPipeline/index.js:48-61` dựng `groundingRefs = [{ sourceId, contentKind, tokens }]` từ nguồn mà budgeter chọn (deterministic, **không** do LLM sinh).
- Persist trên message (`conversationRepository.js:100, 1082`), render bởi `src/entrypoints/sidepanel/components/chat/ChatMessage.svelte:340-352` → nút "N sources" mở `src/entrypoints/sidepanel/components/chat/ChatSourceDrawer.svelte` (resolve `sourceId → {title,url,type}`).
- Đây là "câu trả lời này dùng những trang nào", **không** phải "câu này lấy từ đoạn nào". Inline citation là **nấc granularity tiếp theo**, và `groundingRefs` là hook tự nhiên để mở rộng.

### 3.4 Rendering — **precedent tái dùng được**
- Assistant message render qua `src/components/markdown/StreamingMarkdownV2.svelte` (engine `@humanspeak/svelte-markdown`, có custom renderer + preprocess).
- **`src/lib/utils/timestampProcessor.js#processTimestamps()`** viết lại `[MM:SS]` → link `timestamp:<giây>`.
- **`src/components/markdown/TimestampLink.svelte`**: click → `browser.tabs.sendMessage(tabId, { action: 'seekToTimestamp', … })` để tua video.
- → **"Click → nhảy tới vị trí trong nguồn" đã chạy hoàn chỉnh cho video.** Inline citation về cơ bản là *nhân bản pattern này*: thêm loại link `cite:` + component `CiteLink` gửi `action: 'scrollToCiteId'`.

### 3.5 Skills — prompt-injection snippet, không phải tool-calling
`src/lib/chat/skills/builtInSkills.js`: `summarize, analyze, explain, debate, translate, comment-analysis, chapter-summary, course-concepts`. Mỗi skill `{ id, version, name, instruction, pinned, sourceMode }`. `sourceMode` quyết định nguồn auto-capture.
- One-shot: `formatSkillInvocation()` bọc `[[ONE_SHOT_SKILL …]]…[[/…]]`, chỉ áp lượt hiện tại.
- Triết lý **thin skill**: format nằm ở `DEFAULT_RESPONSE_BEHAVIOR` (system prompt), skill chỉ lo *mục tiêu ngữ nghĩa*. → Không nên nhồi cơ chế footnote vào skill `summarize`.

### 3.6 Ràng buộc bất biến (BẮT BUỘC tôn trọng)
- **Cache-stable prefix** (`context-budget-cache-invariant`): source block phải **byte-identical** qua các lượt để hit prompt-cache. Test `renders an identical source block regardless of the current question length` (`tests/chat/contextPipeline/contextPipeline.test.js:151`) canh giữ. → Đánh số/chèn anchor được, *miễn là* deterministic từ nội dung (cùng nội dung → cùng id mọi lượt).
- **Estimator lạc quan**: `estimateTokens = chars/4`, under-estimate tiếng Việt ~1.4×, CJK ~4× (hướng không an toàn). → Anchor làm phình token; đừng nâng utilisation.
- **Budgeter có thể cắt/bỏ nguồn** theo token (raw → condensed → truncated prefix). → Model có thể cite một đoạn *không thực sự nằm trong context*.
- **Nguồn là untrusted**: mọi scheme phải giữ guardrail; id do model nhả phải được **validate**.

## 4. Ý tưởng thiết kế đã hội tụ: DOM-anchored inline citation

**Luồng:**
1. Khi add context (tab A, tab B…), hàm lấy context trả về **dạng cây** và **đánh dấu DOM** đồng thời: mỗi chunk gắn một id ổn định (vd `data-cite-id="a2"`) *hoặc* ghi lại một locator để tìm lại sau.
2. Cây context (kèm id) gửi vào LLM; skill/mode dặn: *khi nêu luận điểm dựa trên nguồn, trích dẫn id tương ứng*.
3. Câu trả lời chứa marker (vd `[a2]`); renderer tìm marker → đổi thành component `CiteLink`.
4. Click `CiteLink` → message xuống content script của tab tương ứng → cuộn tới node + highlight.

**Nguyên tắc nền — tách 2 việc (đừng gộp):**
- **Gán địa chỉ cho nguồn (tạo id)** = việc của **code**, deterministic. KHÔNG để model "tự bịa id" (id sẽ trỏ hư không, không verify được → tệ hơn không trích dẫn). Cũng không cần một lượt LLM riêng để chunk (tốn cost, non-deterministic) trừ khi cần phân mục *ngữ nghĩa*.
- **Tham chiếu id trong câu trả lời** = việc của **model** (chỉ model biết câu nó viết đến từ đoạn nào; một luận điểm tổng hợp có thể trỏ *nhiều* id). Đây thuộc skill/mode.

## 5. Điểm khó cốt lõi: vòng đời & cách gỡ

DOM-anchored id là anchor **runtime-only, live-only**: sống đúng bằng vòng đời phiên tab. Nhưng message thì persist → mở lại conversation ngày sau = link chết hàng loạt.

**→ Không cố làm anchor bền hơn. Làm cho lúc gãy nó *degrade duyên dáng*.**

Mấu chốt: `[a2]` không nên là id DOM trần, mà resolve về một **citation record tự mô tả**, persist kèm message:
```
{ id: "a2", sourceId: "…", quote: "<trích nguyên văn đoạn được cite>",
  domId: "a2", locator?: <xpath|text-locator> }
```
`domId`/`locator` chỉ là **fast path**. Click đi theo **thang degrade**:

| Mức | Tình huống | Hành vi |
|-----|-----------|---------|
| 1 | Tab sống, node còn | Cuộn tới `[data-cite-id]` + highlight (đẹp nhất) |
| 2 | Tab sống, node re-render mất (SPA/virtualized) | Tìm lại theo `quote` (in-page find / Text Fragment) |
| 3 | Tab đóng/đổi trang, còn URL | Mở URL + `#:~:text=<quote>` để load-and-scroll |
| 4 | Không gì chạy | Hiện `quote` trong tooltip/drawer (như `ChatSourceDrawer`) — **không bao giờ link chết** |

Vì citation **tự mang đủ text để tự mô tả**, mất live-anchor chỉ tụt từ "nhảy tới" xuống "hiện trích dẫn". "Đóng tab" trở thành **hành vi mong đợi** (mức 4), không phải bug. Khớp nguyên tắc persistent-vs-runtime của dự án: lưu `sourceId + quote` (bền), `domId` chỉ là enrichment.

## 6. Cân nhắc kỹ thuật (checklist khi thiết kế chi tiết)

- **Id namespace ngắn & tách khỏi DOM id thật**: model *thấy* `a1,a2,b1…` (prefix = tab để biết cuộn tab nào); map sang locator thật ở bảng phụ. Đừng nhồi XPath/DOM-id dài vào prompt (tốn token + model chép sai).
- **Mutate DOM vs locator**: chèn `data-cite-id` = chính xác nhưng dễ bị framework hydrate/mutation-observer xoá, và sửa DOM của nhiều tab. Thay thế: chỉ ghi **locator** (xpath/text) rồi tìm lại lúc click (không đụng trang, sống sót re-render tốt hơn, kém chính xác hơn). Bản mạnh nhất: **cả hai** (id cho fast path + quote/locator cho phần còn lại).
- **Marker format**: model nhả `[a2]`/`[^a2]` *ổn định hơn* `<<a2>>` (tokenizer hay cắt `<< >>`, lẫn với generic/template). Dặn model **chỉ dùng id trong tập được cấp**. Lúc render **validate**: id lạ → text thường, không dựng link.
- **SPA re-render** = ca gãy *thầm lặng* phổ biến nhất (tab mở, URL nguyên, node đã bị thay). Test trên trang tĩnh sẽ tưởng ngon rồi vỡ trên trang thật.
- **Budgeter truncation → dangling cite**: model cite `a47` nhưng `a47` đã bị cắt khỏi context. Renderer phải chịu được; `SOURCE_GUARDRAIL` đã cảnh báo model không bịa phần bị cắt.
- **Cache invariant**: đánh số/anchor phải deterministic từ nội dung → source block vẫn byte-stable. Lưu ý: bật anchor chỉ trong "cited mode" nghĩa là prefix khác giữa mode thường và mode cite (chấp nhận được nếu mode sticky theo conversation).
- **Prompt-injection**: id/anchor nằm trong vùng nguồn untrusted; giữ escape + guardrail; validate id ở render.

## 7. Phạm vi & mode (product framing)

- **Không** bật inline citation mặc định cho `summarize`/`analyze` (bảo vệ chất lượng tóm tắt: fluency tax, cite bịa/gán sai, chửi nhau với thin-skill).
- Làm thành **mode/skill opt-in** ("Cited Q&A"): người dùng đặt câu hỏi riêng + kích hoạt → mới đánh số + mới bắt model trích dẫn. Vừa bảo vệ mặc định, vừa **khoanh vùng chi phí**, vừa khớp cơ chế one-shot skill sẵn có.
- Trích dẫn *đáng giá nhất* ở **Q&A dữ kiện trên nguồn**, không phải ở tóm tắt tổng hợp.
- **Quick win độc lập**: biến timestamp video/course (đã có `TimestampLink`) thành clickable seek — gần như free, không đụng LLM/cache; nên làm trước như một dạng citation.

## 8. Cái nên / không nên giao cho model

| | Model | Code (deterministic) |
|--|-------|----------------------|
| Gán id/địa chỉ cho nguồn | ❌ (bịa, non-deterministic) | ✅ đánh số cây / tái dùng timestamp |
| Chọn id nào để cite (có thể nhiều) | ✅ (chỉ model biết synthesis) | ❌ |
| Chunk theo *ngữ nghĩa* (section theo chủ đề) | ✅ nhưng tốn 1 lượt LLM/nguồn — chỉ khi thực sự cần | regex chỉ chia được cơ học |
| Validate id / render link | ❌ | ✅ |

## 9. Câu hỏi mở (nghiên cứu tiếp)

1. Cây context: schema chuẩn hoá thế nào (node type, id, text, locator)? Serialize ra source block ra sao để vừa byte-stable vừa gọn token?
2. Locator bền: dùng gì (XPath tương đối? text-anchor kiểu Text Fragment? cả hai)? Đo tỉ lệ re-find thành công trên SPA thật.
3. Chi phí token của việc chèn id vào source block — đo với tiếng Việt/CJK, so với estimator.
4. Cross-tab: id `a*`/`b*` map tab nào lúc click khi `tabId` runtime đã đổi (mở lại conversation)? Cần lưu gì để mức 3 (mở URL + text fragment) chạy.
5. UX marker: hiển thị thế nào (số nhỏ, chip, superscript)? Hover preview lấy `quote` từ đâu (đã persist trong citation record).
6. Highlight sau khi cuộn: cơ chế inject highlight tạm vào trang (giống `seekToTimestamp` làm gì trong content script).
7. Firefox optional-permissions cho content script tab đích (dự án đã có luồng permission — tái dùng).

## 10. Tham chiếu code

- Pipeline: `src/lib/chat/contextPipeline/{index,sourceResolver,contextBudgeter,contextAssembler,sourceFormatter}.js`
- Source model: `src/services/chat/chatSourceService.js#persistSnapshot`
- Grounding (hook mở rộng): `src/lib/chat/contextPipeline/index.js:48`, `src/entrypoints/sidepanel/components/chat/ChatSourceDrawer.svelte`, `src/entrypoints/sidepanel/components/chat/ChatMessage.svelte:340`
- Render precedent (nhân bản): `src/lib/utils/timestampProcessor.js`, `src/components/markdown/TimestampLink.svelte`, `src/components/markdown/StreamingMarkdownV2.svelte`
- Skills: `src/lib/chat/skills/{builtInSkills,skillService}.js`, `src/entrypoints/prompt/SkillsPage.svelte`
- @tab / capture: `src/services/chat/tabMentionService.js`, `src/services/contentService.js#getPageContent`, `background.js` (executeScript by tabId)
- Ràng buộc: `tests/chat/contextPipeline/contextPipeline.test.js:151`; docs nền: `docs/chat-harness-discussion.md`, `docs/chat-context-budget-v1.md`
