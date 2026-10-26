// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushSync, mount, unmount } from 'svelte'

// Mock svelte-i18n — same shape as tests/chat/ChatMessageMeta.test.svelte.js
vi.mock('svelte-i18n', () => {
  const store = (/** @type {string} */ key, /** @type {object|undefined} */ opts) => {
    let text = opts?.default || key
    if (opts?.values) {
      for (const [k, v] of Object.entries(opts.values)) {
        text = text.replace(`{${k}}`, v)
      }
    }
    return text
  }
  store.subscribe = (/** @type {Function} */ fn) => {
    fn(store)
    return () => {}
  }
  return { _: store }
})

const { default: ChatContextGauge } = await import(
  '../../src/components/chat/ChatContextGauge.svelte'
)

const MODEL = 'inclusionai/ling-3.0-flash:free'
const WINDOW = 262_100

/** Real turns: turn 2 served most of its prompt from cache. */
const TURNS = [
  { ts: 1, model: MODEL, input: 16_132, output: 2_701, cache: 0 },
  { ts: 2, model: MODEL, input: 19_144, output: 2_129, cache: 16_384 },
]

/** The live `onDiagnostics` payload for the last of those turns. */
const usage = (over = {}) => ({
  available: true,
  used: 19_144,
  window: WINDOW,
  input: 19_144,
  output: 2_129,
  cached: 16_384,
  providerId: 'openrouter',
  modelId: MODEL,
  ...over,
})

function render(props) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const component = mount(ChatContextGauge, { target: host, props })
  flushSync()
  return {
    host,
    component,
    open() {
      host.querySelector('button')?.click()
      flushSync()
    },
    // The popover is portalled to <body>, so it is never inside `host`.
    panelText: () => document.body.textContent,
    fills: () => [...host.querySelectorAll('rect')],
    async destroy() {
      await unmount(component)
      host.remove()
    },
  }
}

describe('ChatContextGauge', () => {
  it('shows the snapshot and the cumulative block as separate, labelled figures', async () => {
    const view = render({ usage: usage(), turns: TURNS })
    view.open()
    const text = view.panelText()

    // Snapshot: last turn only. 19,144 + 2,129 = 21,273.
    expect(text).toContain('21.3K / 262.1K')
    expect(text).toContain('19.1K')
    expect(text).toContain('2.1K')

    // Cumulative, under a heading that names it. 35,276 input / 4,830 output.
    expect(text).toContain('Session · 2 turns')
    expect(text).toContain('35.3K')
    expect(text).toContain('4.8K')

    await view.destroy()
  })

  it('renders cached as an indented breakdown of the input above it', async () => {
    const view = render({ usage: usage(), turns: TURNS })
    view.open()
    const text = view.panelText()
    // Lower-case label behind a tree character: a part of Input, not a peer of it.
    expect(text).toContain('└ cached')
    expect(text).toContain('16.4K')
    await view.destroy()
  })

  it('carries no percentages — those live on the bar tooltip', async () => {
    const view = render({ usage: usage(), turns: TURNS })
    view.open()
    // Below 80% the panel is numbers only; the near-limit warning is the sole
    // place a percentage is ever spelled out here.
    expect(view.panelText()).not.toMatch(/\d+%/)
    await view.destroy()
  })

  it('emits every cell as a direct child of one grid', async () => {
    // jsdom has no layout, so the axis cannot be measured — but it can only line
    // up if the cells share a single grid. A per-row wrapper div would size the
    // `auto` value column to that row's own content and break the alignment, so
    // the structural check is: no row wrappers, only cells.
    const view = render({ usage: usage(), turns: TURNS })
    view.open()
    const grid = [...document.body.querySelectorAll('div')].find(
      (d) => d.className.includes('grid-cols-') && d.textContent.includes('Session'),
    )
    expect(grid).toBeTruthy()

    const cells = [...grid.children]
    // Only the section heading spans the full width; everything else is a cell.
    const spanning = cells.filter((c) => c.classList.contains('col-span-2'))
    expect(spanning).toHaveLength(1)
    expect(spanning[0].textContent.trim()).toBe('Session · 2 turns')

    // Label + value for each of: Model, Context window, Input, cached, Output,
    // then Input, cached, Output again under the session heading = 8*2 + 1.
    expect(cells).toHaveLength(17)
    // No row is wrapped: every non-heading child is a leaf cell.
    for (const cell of cells) {
      if (cell.classList.contains('col-span-2')) continue
      expect(cell.tagName).toBe('SPAN')
      expect(cell.querySelector('span')).toBeNull()
    }
    await view.destroy()
  })

  it('never renders cache as an amount added to input', async () => {
    const view = render({ usage: usage(), turns: TURNS })
    view.open()
    const text = view.panelText()
    // 19,144 + 2,129 + 16,384 = 37,657 → the wrong "37.7K" that appears if cache
    // is treated as a fourth bucket instead of a slice of input.
    expect(text).not.toContain('37.7K')
    // 35,276 + 16,384 = 51,660 → the same mistake on the cumulative block.
    expect(text).not.toContain('51.7K')
    await view.destroy()
  })

  it('hides the cumulative block until a request has been made', async () => {
    const view = render({
      usage: {
        used: 0,
        window: WINDOW,
        input: null,
        output: null,
        cached: null,
        modelId: MODEL,
      },
      turns: [],
    })
    view.open()
    const text = view.panelText()
    // Shown without its `inclusionai/` namespace, which is the widest and least
    // informative part of the id; the full value stays on the title attribute.
    expect(text).toContain('Ling 3.0 flash:free')
    expect(text).not.toContain('inclusionai/')
    expect(document.body.querySelector(`[title="${MODEL}"]`)).toBeTruthy()
    expect(text).toContain('0 / 262.1K')
    expect(text).not.toContain('Session ·')
    expect(text).not.toContain('cached')
    await view.destroy()
  })

  it('warns past 80% and estimates the turns left', async () => {
    // Occupancy 220K of 262.1K = 84%, growing 10K per turn.
    const highTurns = [
      { ts: 1, model: MODEL, input: 190_000, output: 10_000, cache: 0 },
      { ts: 2, model: MODEL, input: 210_000, output: 10_000, cache: 0 },
    ]
    const view = render({
      usage: usage({ used: 210_000, input: 210_000, output: 10_000, cached: 0 }),
      turns: highTurns,
    })
    view.open()
    const text = view.panelText()
    expect(text).toContain('84%')
    expect(text).toContain('turns left')
    expect(text).toContain('start a new chat')
    await view.destroy()
  })

  it('stays quiet below 80%', async () => {
    const view = render({ usage: usage(), turns: TURNS })
    view.open()
    expect(view.panelText()).not.toContain('start a new chat')
    await view.destroy()
  })

  it('shows no cost row for a :free model even though pricing ran', async () => {
    const view = render({ usage: usage(), turns: TURNS })
    view.open()
    expect(view.panelText()).not.toContain('Cost')
    await view.destroy()
  })

  it('leaves occupancy unknown when the provider reports nothing', async () => {
    // The blocking fallback path (Firefox mobile) reports no usage at all.
    const view = render({
      usage: usage({ available: false, input: null, output: null, cached: null }),
      turns: TURNS,
    })
    view.open()
    const text = view.panelText()
    expect(text).toContain('— / 262.1K')
    expect(text).not.toContain('21.3K')
    // Session totals come from the persisted turns, so they survive it.
    expect(text).toContain('35.3K')
    await view.destroy()
  })

  it('projects attached-but-unsent tabs onto the bar', async () => {
    const withPending = render({
      usage: usage(),
      turns: TURNS,
      pendingEstimate: 50_000,
    })
    const pending = withPending.fills().find((r) => r.getAttribute('opacity') === '0.4')
    expect(pending).toBeTruthy()
    expect(Number(pending.getAttribute('width'))).toBeGreaterThan(0)
    await withPending.destroy()

    const without = render({ usage: usage(), turns: TURNS, pendingEstimate: 0 })
    expect(without.fills().some((r) => r.getAttribute('opacity') === '0.4')).toBe(false)
    await without.destroy()
  })

  it('colours the bar on the projected total, before the oversized send', async () => {
    // 21.3K used + 240K pending on a 262.1K window crosses the error threshold
    // even though what is already used sits at 8%.
    const view = render({ usage: usage(), turns: TURNS, pendingEstimate: 240_000 })
    const filled = view.fills().find((r) => r.getAttribute('opacity') !== '0.4')
    expect(filled.getAttribute('fill')).toBe('var(--color-error)')
    await view.destroy()
  })
})
