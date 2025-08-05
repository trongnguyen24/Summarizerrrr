<!-- @ts-nocheck -->
<script>
  import StreamingMarkdown from './StreamingMarkdown.svelte'
  import StreamingMarkdownV2 from './StreamingMarkdownV2.svelte'
  import {
    summarizeContentStream,
    summarizeContentStreamEnhanced,
  } from '@/lib/api/api.js'

  let demoText = $state('')
  let isStreaming = $state(false)
  let streamingMode = $state('v2') // 'v1' or 'v2' - Default to v2 (AI SDK v5)
  let demoType = $state('sample') // 'sample' or 'api'

  // Sample markdown content for testing
  const sampleMarkdown = `# AI SDK v5 Smoothing Streams Demo

## Giới thiệu về Quantum Computing

Quantum computing là một paradigm tính toán **hoàn toàn mới** sử dụng các nguyên lý của cơ học lượng tử.

### Các khái niệm cơ bản:

1. **Qubit** - Đơn vị thông tin lượng tử
2. **Superposition** - Trạng thái chồng chập
3. **Entanglement** - Sự rối lượng tử

### Code example:

\`\`\`python
# Quantum circuit example
from qiskit import QuantumCircuit, Aer, execute

# Tạo quantum circuit với 2 qubits
qc = QuantumCircuit(2, 2)

# Áp dụng Hadamard gate
qc.h(0)

# Tạo entanglement
qc.cx(0, 1)

# Đo kết quả
qc.measure_all()

print("Quantum circuit created!")
\`\`\`

### JavaScript example:

\`\`\`javascript
// AI SDK v5 Smoothing Implementation
const { streamText } = await import('ai')

const result = await streamText({
  model: googleProvider('gemini-2.0-flash'),
  prompt: 'Explain quantum computing',
  smoothing: {
    minDelayMs: 15,
    maxDelayMs: 80
  }
})

for await (const chunk of result.smoothTextStream) {
  console.log(chunk)
}
\`\`\`

## Ưu điểm của AI SDK v5:

- ✅ **Smoothing streams** cho trải nghiệm mượt mà
- ✅ **Multiple providers** support
- ✅ **Type safety** với TypeScript
- ✅ **Easy integration** với các framework

> **Lưu ý**: Smoothing streams giúp tạo ra trải nghiệm người dùng tốt hơn bằng cách điều chỉnh timing của text chunks.

Kết luận: AI SDK v5 mang lại nhiều cải tiến đáng kể cho việc streaming AI responses.`

  async function startSampleDemo() {
    if (isStreaming) return

    demoText = ''
    isStreaming = true

    // Simulate streaming với sample content
    const words = sampleMarkdown.split(' ')
    let currentIndex = 0

    const streamInterval = setInterval(
      () => {
        if (currentIndex < words.length) {
          demoText += (currentIndex === 0 ? '' : ' ') + words[currentIndex]
          currentIndex++
        } else {
          clearInterval(streamInterval)
          isStreaming = false
        }
      },
      streamingMode === 'v1' ? 50 : 30
    ) // V2 faster due to smoothing
  }

  async function startApiDemo() {
    if (isStreaming) return

    demoText = ''
    isStreaming = true

    try {
      // Sample content for API demo
      const sampleContent =
        'Giải thích về quantum computing một cách đơn giản với ví dụ và code.'

      if (streamingMode === 'v2') {
        // Use enhanced streaming
        const streamGenerator = summarizeContentStreamEnhanced(
          sampleContent,
          'general'
        )

        for await (const { fullText, isComplete } of streamGenerator) {
          demoText = fullText
          if (isComplete) {
            isStreaming = false
            break
          }
        }
      } else {
        // Use traditional streaming
        const streamGenerator = summarizeContentStream(sampleContent, 'general')

        for await (const chunk of streamGenerator) {
          demoText += chunk
        }
        isStreaming = false
      }
    } catch (error) {
      console.error('Demo streaming error:', error)
      isStreaming = false
      demoText = `Error: ${error.message}\n\nPlease check your API configuration in settings.`
    }
  }

  function handleFinish() {
    console.log('Streaming completed!')
  }

  function startDemo() {
    if (demoType === 'sample') {
      startSampleDemo()
    } else {
      startApiDemo()
    }
  }
</script>

<div class="streaming-demo">
  <div class="controls">
    <h3>🚀 AI SDK v5 Smoothing Streams Demo</h3>

    <div class="demo-type-selector">
      <label>
        <input type="radio" bind:group={demoType} value="sample" />
        Sample Content (No API required)
      </label>
      <label>
        <input type="radio" bind:group={demoType} value="api" />
        Real API Demo (Requires API key)
      </label>
    </div>

    <div class="mode-selector">
      <label>
        <input type="radio" bind:group={streamingMode} value="v1" />
        🎭 Traditional Typing Effect (v1)
      </label>
      <label>
        <input type="radio" bind:group={streamingMode} value="v2" />
        ⚡ AI SDK Smoothing + Hybrid (v2)
      </label>
    </div>

    <button on:click={startDemo} disabled={isStreaming} class="demo-btn">
      {isStreaming ? '⏳ Streaming...' : '▶️ Start Demo'}
    </button>

    <div class="info">
      <p>
        <strong>Current Mode:</strong>
        {streamingMode === 'v1' ? 'Traditional' : 'AI SDK v5 Smoothing'}
      </p>
      <p>
        <strong>Demo Type:</strong>
        {demoType === 'sample' ? 'Sample Content' : 'Real API'}
      </p>
    </div>
  </div>

  <div class="demo-container">
    {#if streamingMode === 'v1'}
      <div class="demo-section">
        <h4>🎭 Traditional Typing Effect</h4>
        <StreamingMarkdown
          sourceMarkdown={demoText}
          speed={15}
          onFinishTyping={handleFinish}
          class="demo-content"
        />
      </div>
    {:else}
      <div class="demo-section">
        <h4>⚡ AI SDK v5 Smoothing + Hybrid</h4>
        <StreamingMarkdownV2
          sourceMarkdown={demoText}
          onFinishTyping={handleFinish}
          enableCursor={true}
          enableHighlight={true}
          class="demo-content"
        />
      </div>
    {/if}
  </div>
</div>

<style>
  .streaming-demo {
    max-width: 900px;
    margin: 20px auto;
    padding: 24px;
    border-radius: 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }

  .controls {
    margin-bottom: 24px;
    padding: 20px;
    border-radius: 12px;
    background: white;
    border: 2px solid #e2e8f0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .controls h3 {
    margin: 0 0 16px 0;
    color: #1e293b;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .demo-type-selector,
  .mode-selector {
    margin: 16px 0;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .demo-type-selector label,
  .mode-selector label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #475569;
    padding: 8px 12px;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .demo-type-selector label:hover,
  .mode-selector label:hover {
    background: #f1f5f9;
    color: #334155;
  }

  .demo-btn {
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    cursor: pointer;
    font-weight: 600;
    font-size: 16px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .demo-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  }

  .demo-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .info {
    margin-top: 16px;
    padding: 12px 16px;
    background: #f8fafc;
    border-radius: 8px;
    border-left: 4px solid #10b981;
  }

  .info p {
    margin: 4px 0;
    font-size: 14px;
    color: #475569;
  }

  .demo-container {
    min-height: 300px;
  }

  .demo-section h4 {
    margin-bottom: 16px;
    color: #1e293b;
    font-size: 1.2rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.demo-content) {
    padding: 20px;
    border-radius: 12px;
    background: white;
    border: 2px solid #e2e8f0;
    min-height: 200px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    line-height: 1.7;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .streaming-demo {
      margin: 10px;
      padding: 16px;
    }

    .demo-type-selector,
    .mode-selector {
      flex-direction: column;
      gap: 12px;
    }
  }
</style>
