<script>
  // @ts-nocheck
  import PlusIcon from '@/components/PlusIcon.svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'

  const options = {
    scrollbars: {
      visibility: 'auto',
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })
  const [initialize2, instance2] = useOverlayScrollbars({
    options,
    defer: true,
  })

  let list = [
    'Effective System Prompt Strategies',
    'Prompt Design Critique',
    'AI Prompt Enhancement Strategy',
    'Vibecoding: The Good, The Bad, and The Ugly',
    'AI-Powered Development Workflow',
    'The Future of Prompt Engineering',
    'Understanding Large Language Models',
    'Building Scalable SaaS Applications',
    'Security Best Practices in AI Development',
    'Community-Driven AI Insights',
    'Optimizing AI Prompts for Code Generation',
    'The Role of AI in Software Architecture',
    'Debugging AI-Generated Code',
    'Context Management in LLMs',
    'Task Management with AI Tools',
    'Agile Methodologies for AI Projects',
    'Data Privacy in AI Applications',
    'The Evolution of AI Assistants',
    'From Idea to SaaS: An AI Journey',
    'Prompt Engineering for Beginners',
    'Advanced AI Development Techniques',
    'The Impact of AI on Developer Productivity',
    'Navigating AI-Driven Development Challenges',
    'From Idea to SaaS: An AI Journey',
    'Prompt Engineering for Beginners',
    'Advanced AI Development Techniques',
    'The Impact of AI on Developer Productivity',
    'Navigating AI-Driven Development Challenges',
  ]

  $effect(() => {
    initialize(document.getElementById('scroll-side'))
    initialize2(document.getElementById('scroll-content'))
  })
</script>

<main
  class="flex text-sm relative min-w-4xl min-h-dvh bg-background text-text-primary"
>
  <!-- Left Column: Prompt Menu -->
  <div
    class="top-stripes sticky top-0 w-8 h-screen border-r border-border/70"
  ></div>
  <div
    class="w-80 gap-3 top-0 relative h-screen z-20 bg-background overflow-hidden border-r border-border/70 flex flex-col"
  >
    <h2 class="text-lg p-4 font-bold">Archive</h2>
    <div class="px-4">
      <input
        class="px-4 py-2 rounded-md border w-full border-border"
        type="search"
        name="search"
        id="search"
        placeholder="Search"
      />
    </div>
    <div id="scroll-side" class="text-text-secondary flex-1 relative gap-0.5">
      <div
        class=" sticky bg-linear-to-b from-background to-background/40 mask-b-from-50% left-0 top-0 right-3 h-6 backdrop-blur-[2px] z-30 pointer-events-none"
      ></div>
      <div class="flex absolute inset-0 px-4 py-6 h-full flex-col gap-px">
        <a
          href="#2"
          class=" p-1.5 transition-colors duration-125 bg-blackwhite/5 rounded-sm"
        >
          <div class="line-clamp-1">User agent stylesheet</div>
        </a>
        {#each list as item}
          <a
            href="#{item}"
            class=" p-1.5 transition-colors duration-125 hover:bg-blackwhite/2 rounded-sm"
          >
            <div class="line-clamp-1">{item}</div>
          </a>
        {/each}
      </div>
    </div>
    <div
      class=" absolute bg-linear-to-t from-background to-background/40 mask-t-from-50% left-0 right-3 bottom-0 h-6 backdrop-blur-[2px] z-30 pointer-events-none"
    ></div>
  </div>

  <!-- Right Column -->
  <div
    id="scroll-content"
    class="flex-1 relative h-screen overflow-auto bg-surface-1 z-20 p-4 flex flex-col gap-2"
  >
    <!-- <PlusIcon /> -->

    <div class="prose w-full max-w-3xl prose-xs mx-auto">
      <h1 class="mx-auto text-center text-2xl font-bold mt-16 mb-8">
        Effective System Prompt Strategies
      </h1>
      <div id="summary">
        <p>
          Tuyệt vời! Dưới đây là tóm tắt chi tiết về trải nghiệm "vibecoding" và
          những phản hồi thú vị từ cộng đồng Reddit:
        </p>
        <h2 id="vibecoding-ng-l-hn-lon-nu-khng-c-hng-dn-r-rng-266e">
          Vibecoding Đúng là Hỗn Loạn Nếu Không Có Hướng Dẫn Rõ Ràng! 😱
        </h2>
        <p>
          Bạn tác giả bài viết trên Reddit đã chia sẻ một bài học xương máu về
          việc sử dụng AI (cụ thể là Cursor) trong "vibecoding" – tức là viết
          code theo cảm hứng, cứ thế mà làm, để AI tự lo. Ban đầu, bạn ấy cứ
          nghĩ chỉ cần nói cho Cursor biết mình muốn gì, và "Bùm!", một ứng dụng
          SaaS hoàn hảo sẽ ra đời ngay lập tức. Nghe có vẻ dễ dàng và thần kỳ
          đúng không? ✨
        </p>
        <h3 id="c-sc-thc-t-hn-lon-codebase-vrc0">
          Cú Sốc Thực Tế: Hỗn Loạn Codebase 🤯
        </h3>
        <p>
          Thực tế phũ phàng hơn nhiều! Chỉ sau 3 ngày, codebase của bạn tác giả
          biến thành một "nghĩa địa" của những tính năng bị tạo đi tạo lại.
          Cursor cứ thế tạo ra cùng một hàm dịch vụ đến 4 lần, mỗi lần lại hơi
          khác một chút. Hậu quả là bạn ấy phải mất tới 7 tiếng đồng hồ để sửa
          xung đột giữa các hàm mà đáng lẽ ra chúng làm cùng một việc! 🤦&zwj;♂️
        </p>
        <p>
          Mỗi khi bắt đầu một phiên chat mới với AI, bạn tác giả lại phải lặp đi
          lặp lại toàn bộ kiến trúc ứng dụng của mình. AI thì cứ gợi ý những
          thay đổi làm hỏng luôn cả những thứ vừa xây hôm qua. Thậm chí, nó còn
          "não cá vàng" quên béng luôn database schema (cấu trúc cơ sở dữ liệu)
          và gợi ý những cấu trúc bảng hoàn toàn khác biệt. Cứ như có một junior
          dev siêu thông minh nhưng hay quên vậy! 😅
        </p>
        <h3 id="bi-hc-t-gi-sc-mnh-ca-ch-dn-r-rng-ul18">
          Bài Học Đắt Giá: Sức Mạnh của Chỉ Dẫn Rõ Ràng 💡
        </h3>
        <p>
          Cuối cùng, sau khi gần như "phát điên" vì mớ hỗn độn đó, bạn tác giả
          đành bỏ cuộc và dành 2 tiếng để viết ra các hướng dẫn thật rõ ràng.
          Điều kỳ diệu đã xảy ra! Với cùng một AI, cùng một dự án, nhưng giờ đây
          nó lại xây dựng chính xác những gì bạn ấy muốn. Công việc mà trước đây
          tốn 6 tiếng để debug, giờ chỉ còn mất 30 phút! Thời gian được tiết
          kiệm một cách đáng kinh ngạc! 🚀
        </p>
        <p>
          Sự khác biệt ư? Bạn ấy đã ngừng coi Cursor là "phép thuật" và bắt đầu
          coi nó đúng như bản chất của nó: một lập trình viên junior rất thông
          minh, nhưng <strong>cần được chỉ dẫn rõ ràng</strong>! Giống như bạn
          đang hướng dẫn một người mới vào nghề vậy.
        </p>
        <h3 id="gii-php-v-cng-c-h-tr-qdva">Giải Pháp và Công Cụ Hỗ Trợ ✨</h3>
        <p>
          Hiện tại, bạn tác giả đã tìm ra một quy trình hiệu quả hơn: chỉ cần
          nhập ý tưởng SaaS của mình vào <code>coddie.dev</code>, trả lời vài
          câu hỏi, và nhận về một bản kế hoạch dự án đầy đủ kèm theo tất cả các
          tài liệu cần thiết. Sau đó, bạn ấy đưa những tài liệu này cho Cursor,
          và thế là có thể tận hưởng phần còn lại của ngày thay vì vật lộn trong
          mớ code hỗn loạn. Thật là một cách làm việc thông minh!
        </p>
        <p>
          Bạn ấy cũng hỏi cộng đồng xem có ai cũng phải học bài học này một cách
          khó khăn không, hay đã tìm ra cách dùng chỉ dẫn từ trước khi "tẩu hỏa
          nhập ma"?
        </p>
        <hr />
        <h2 id="community-response-f3vr">Community Response 💬</h2>
        <p>
          Cộng đồng đã có nhiều phản hồi sôi nổi, từ việc ủng hộ quan điểm của
          tác giả cho đến việc cảnh báo các rủi ro tiềm ẩn.
        </p>
        <h3 id="nghi-vn-qung-co-5ple">😅 Nghi Vấn "Quảng Cáo"</h3>
        <ul>
          <li>
            <strong>slimecake &amp; happy_hawking</strong>: Một số người ngay
            lập tức nhận ra tên <code>coddie.dev</code> và cáo buộc đây là một
            bài viết "quảng cáo trắng trợn" hoặc "thuyết phục lộ liễu"
            (shilling). <code>happy_hawking</code> thậm chí còn nói tác giả "spam
            link ở nhiều sub khác".
          </li>
          <li>
            <strong>1clicktask (Tác giả)</strong>: Liên tục phủ nhận việc quảng
            cáo, nói rằng không hề "pitch" sản phẩm.
          </li>
        </ul>
        <h3 id="quan-im-v-ai-junior-dev-92bz">
          🧠 Quan Điểm về AI "Junior Dev"
        </h3>
        <ul>
          <li>
            <strong>pajarator</strong>: Đồng ý rằng AI <strong>hành xử</strong> như
            một junior dev. Tuy nhiên, bản chất của nó vẫn là một LLM (mô hình ngôn
            ngữ lớn) phân tích và tạo code dựa trên hướng dẫn. Anh ấy nhấn mạnh rằng
            con người chúng ta thường bỏ qua những điều "hiển nhiên" khi giải thích,
            trong khi LLM lại dựa trên những gì nó được huấn luyện là "hiển nhiên",
            dẫn đến việc dễ đi chệch hướng. Anh ấy cũng đạt kết quả tốt nhất khi
            giải thích từ từ và kiểm tra kỹ lưỡng.
          </li>
          <li>
            <strong>1clicktask (Tác giả)</strong>: Hoàn toàn đồng ý, cho rằng
            LLM suy cho cùng chỉ là công cụ nhận diện mẫu. Hướng dẫn càng tốt,
            đầu ra càng tốt.
          </li>
        </ul>
        <h3 id="tm-quan-trng-ca-ch-dn-cu-trc-jkoa">
          📝 Tầm Quan Trọng của Chỉ Dẫn &amp; Cấu Trúc
        </h3>
        <ul>
          <li>
            <strong>scragz</strong>: Anh ấy áp dụng quy trình 3 bước cho mỗi
            tính năng lớn: Request (Yêu cầu), Spec (Đặc tả), Plan (Kế hoạch).
          </li>
          <li>
            <strong>Bbookman</strong>: Thừa nhận mình dành nhiều thời gian hơn
            để tạo kế hoạch, tài liệu và quy tắc so với việc viết code. Điều này
            cho thấy việc chuẩn bị là cực kỳ quan trọng.
          </li>
        </ul>
        <h3 id="vn-qun-l-ng-cnh-ghi-nh-xnr4">
          🤯 Vấn Đề Quản Lý Ngữ Cảnh &amp; Ghi Nhớ
        </h3>
        <ul>
          <li>
            <strong>Aumpa</strong>: Đưa ra một giải pháp cực kỳ hữu ích: nên có
            một file chứa giải thích về kiến trúc ứng dụng cùng tất cả ngữ cảnh
            cần thiết. Khi bắt đầu phiên chat mới, chỉ cần yêu cầu AI "đọc file
            này". Anh ấy còn chia sẻ việc mình có cả một "series" file từ
            readme, to-do list, hướng dẫn cộng tác (làm từng bước một), tóm tắt
            dự án, log xử lý sự cố, file ghi nhớ (để đồng bộ ký ức từ các phiên
            trước), và thậm chí cả giao thức kết thúc phiên làm việc. Điều thú
            vị là chính AI đã giúp anh ấy tạo ra các file này! Anh ấy backup mọi
            thứ lên GitHub sau mỗi phiên.
          </li>
          <li>
            <strong>uptokesforall</strong>: Chia sẻ kinh nghiệm tương tự nhưng
            gặp vấn đề khi cho AI quá nhiều quyền tự quyết: nếu nói AI "tiếp tục
            kế hoạch" hơn hai lần, nó sẽ tự ý làm gộp các bước 3-10 với ít công
            sức hơn và cố gắng viết các log "làm cho có".
          </li>
        </ul>
        <h3 id="cng-c-v-phng-php-qun-l-tc-v-wg66">
          🛠️ Công Cụ và Phương Pháp Quản Lý Tác Vụ
        </h3>
        <ul>
          <li>
            <strong>FormalFix9019</strong>: Đề xuất sử dụng Claude Taskmaster
            hoặc phương pháp BMAD (dựa trên Agile) để quản lý tác vụ. Taskmaster
            tự động tạo và chạy các tác vụ/tác vụ con. BMAD phức tạp hơn nhưng
            hiệu quả.
          </li>
          <li>
            <strong>flipd0ubt</strong>: Hỏi xin hướng dẫn về BMAD vì nó có vẻ
            phức tạp.
          </li>
          <li>
            <strong>xricexboyx</strong>: Đã thử Taskmaster nhưng thấy hơi thừa
            vì Claude của anh ấy đã tự quản lý checklist rồi. Anh ấy hỏi liệu
            Taskmaster có tốt hơn không.
          </li>
          <li>
            <strong>FormalFix9019</strong>: Giải thích thêm rằng anh ấy dùng
            Taskmaster với Cursor hoặc Windsurf (một công cụ khác), nên không bị
            trùng lặp. Hiện tại thì dùng BMAD nhiều hơn, tuy chậm hơn nhưng hiệu
            quả với anh ấy.
          </li>
        </ul>
        <h3 id="cnh-bo-v-ri-ro-bo-mt-c-bit-vi-saas-8ydl">
          🚨 Cảnh Báo về Rủi Ro Bảo Mật (Đặc biệt với SaaS)
        </h3>
        <ul>
          <li>
            <strong>Aztec_Man</strong>: Đây là một trong những bình luận có giá
            trị nhất, cảnh báo về rủi ro bảo mật khi phát triển SaaS bằng
            vibecoding. Anh ấy gợi ý nên tập trung vào các vấn đề có rủi ro bảo
            mật thấp (như shaders, SVGs, plugins, prototypes) thay vì SaaS toàn
            diện.
            <ul>
              <li>
                <strong>Lý do</strong>: Khi cung cấp hệ thống thanh toán hoặc
                dịch vụ trực tuyến, rủi ro chính là
                <strong>thỏa hiệp dữ liệu người dùng và bị kiện</strong>. Đây là
                loại bug tồi tệ nhất.
              </li>
              <li>
                <strong>Thách thức tương lai</strong>: Nếu AI thay thế nhiều lập
                trình viên, có thể sẽ có nhiều "black hat" (hacker mũ đen) gây
                rối qua các cuộc tấn công chuỗi cung ứng.
              </li>
              <li>
                Anh ấy đã cung cấp các liên kết đến các cuộc thảo luận khác
                trong cộng đồng r/vibecoding về chủ đề bảo mật và checklist kiểm
                tra bảo mật cho code do AI tạo ra.
              </li>
            </ul>
          </li>
        </ul>
        <h3 id="cm-nhn-chung-v-vibecoding-jvj0">
          😊 Cảm Nhận Chung về Vibecoding
        </h3>
        <ul>
          <li>
            <strong>Aumpa</strong>: Dù chỉ học code 30 năm trước và chưa bao giờ
            là lập trình viên chuyên nghiệp, anh ấy vẫn coi mình là một "pure
            vibecoder" và thấy nó khá "trao quyền" (empowering) khi sử dụng
            Windsurf.
          </li>
        </ul>
        <hr />
        <p>
          <strong>Tóm lại:</strong> Bài học xương máu là AI không phải là phép thuật.
          Nó là một công cụ mạnh mẽ nhưng cần được hướng dẫn rõ ràng, chi tiết, giống
          như một lập trình viên junior thông minh cần sự định hướng từ senior vậy.
          Việc chuẩn bị tài liệu, cấu trúc dự án từ đầu sẽ giúp tiết kiệm rất nhiều
          thời gian và công sức debug về sau. Đồng thời, cộng đồng cũng cảnh báo
          về rủi ro bảo mật nghiêm trọng khi sử dụng AI để phát triển các hệ thống
          phức tạp như SaaS.
        </p>
        <!---->
      </div>
    </div>
  </div>
  <div
    class="top-stripes sticky top-0 w-8 h-screen border-l border-border/70"
  ></div>
</main>
