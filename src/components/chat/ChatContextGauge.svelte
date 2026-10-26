<script>
  // @ts-nocheck
  import { Popover, Tooltip, mergeProps } from 'bits-ui'
  import { formatK } from '@/lib/utils/formatTokens.js'
  import {
    contextSnapshot,
    ctxGrowthPerTurn,
    sessionCumulative,
    turnsRemaining,
  } from '@/lib/chat/usageMetrics.js'
  import { estimateCost } from '@/lib/chat/usagePricing.js'
  import { formatModelDisplayName } from '@/lib/chat/modelDisplayName.js'
  import { _ } from 'svelte-i18n'

  let {
    /** Real usage of the last sent turn (from the provider), or null before first send. */
    usage = null,
    /** Sum of estimated tokens for @tab chips not yet sent. */
    pendingEstimate = 0,
    /** Raw per-request usage for this conversation, oldest first. */
    turns = [],
  } = $props()

  // The provider reported nothing for the last turn (the blocking fallback path
  // never has usage). Show "unknown" rather than the previous turn's numbers.
  const unavailable = $derived(usage?.available === false)

  // The live last turn, shaped as a Turn so the tested reducers apply to it. Its
  // `cache` is a subset of its `input`, never an addition — see usageMetrics.js.
  const currentTurn = $derived(
    usage && !unavailable && (usage.input != null || usage.output != null)
      ? {
          input: usage.input || 0,
          output: usage.output || 0,
          cache: usage.cached || 0,
        }
      : null,
  )

  // Two reductions of the same raw data, deliberately kept apart: the snapshot is
  // the last turn alone (a turn's input is the whole history re-sent, so summing
  // would double-count), the session totals sum every request (each one was
  // billed separately).
  const snapshot = $derived(contextSnapshot(currentTurn, usage?.window))
  const session = $derived(sessionCumulative(turns))
  // Cost never reads a displayed number: `Input` on screen is the total, and only
  // `input - cache` is billed at the full rate. `sessionCumulative` does that
  // subtraction, `estimateCost` consumes the split.
  const cost = $derived(estimateCost(session, usage?.modelId))

  const percent = $derived(Math.round((snapshot.ctxPercent || 0) * 100))

  // Room left, in turns, from how fast occupancy has been growing. An estimate,
  // and labelled as one.
  const remaining = $derived(
    turnsRemaining(snapshot.ctx, usage?.window, ctxGrowthPerTurn(turns)),
  )
  const nearLimit = $derived((snapshot.ctxPercent || 0) > 0.8)

  function pct(count) {
    if (!usage || !(usage.window > 0)) return 0
    return Math.min(100, Math.max(0, (count / usage.window) * 100))
  }

  // What the next send would occupy: current usage plus the @tab chips already
  // attached but not yet submitted. Drives the colour so the warning appears
  // before the oversized send, not after it.
  const pendingPercent = $derived(
    unavailable
      ? 0
      : Math.max(
          0,
          pct(snapshot.ctx + (pendingEstimate || 0)) - pct(snapshot.ctx),
        ),
  )
  const projectedPercent = $derived(Math.round(percent + pendingPercent))

  const level = $derived(
    projectedPercent >= 95
      ? 'error'
      : projectedPercent >= 80
        ? 'warning'
        : 'normal',
  )

  const fillColor = $derived(
    level === 'error'
      ? 'var(--color-error)'
      : level === 'warning'
        ? 'var(--color-warning)'
        : 'var(--color-primary)',
  )

  // Slanted energy-bar geometry: a parallelogram divided into 5 diagonal cells.
  // Slant leans left ("\"): bottom edge is shifted right of the top edge.
  const W = 100
  const H = 6
  const SLANT = 6
  const SEGMENTS = 5
  // Skew angle that makes a plain rect's edges parallel to the parallelogram sides.
  const SKEW_DEG = (Math.atan(SLANT / H) * 180) / Math.PI

  // Parallelogram outline: bottom-left → top-left → top-right → bottom-right.
  const shape = `M${SLANT},${H} L0,0 L${W - SLANT},0 L${W},${H} Z`

  // Fill width follows percent. Skewed rect (see SKEW_DEG) gives it a slanted
  // leading edge parallel to the notches; clip keeps it inside the shape.
  const TRACK = W - SLANT
  const fillWidth = $derived((percent / 100) * TRACK)
  // Pending segment sits directly after the fill, in the same skewed space, so
  // its leading edge stays parallel to the notches.
  const pendingWidth = $derived((pendingPercent / 100) * TRACK)

  // 4 interior dividers (fractions 1/5..4/5), each parallel to the slanted edge.
  const dividers = $derived(
    Array.from({ length: SEGMENTS - 1 }, (_v, i) => {
      const f = (i + 1) / SEGMENTS
      const bx = SLANT + f * (W - SLANT)
      const tx = f * (W - SLANT)
      return { bx, tx }
    }),
  )

  const ariaLabel = $derived(
    usage && !unavailable
      ? `${$_('chat.context_donut.aria_usage', { default: 'Context window usage:' })} ${percent}%`
      : $_('chat.context_donut.aria_unknown', {
          default: 'Context usage not known yet',
        }),
  )
</script>

<Tooltip.Provider>
  <Popover.Root>
    <Tooltip.Root delayDuration={300} disableHoverableContent>
      <Tooltip.Trigger>
        {#snippet child({ props: tipProps })}
          <Popover.Trigger>
            {#snippet child({ props: popProps })}
              <button
                class="inline-flex items-center justify-center p-0.5 border-none bg-transparent cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-85 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                aria-label={ariaLabel}
                {...mergeProps(tipProps, popProps)}
              >
                <svg
                  width={W}
                  height={H}
                  viewBox="0 0 {W} {H}"
                  class="block overflow-visible"
                >
                  <defs>
                    <clipPath id="gauge-clip">
                      <path d={shape} />
                    </clipPath>
                  </defs>

                  <!-- Track -->
                  <path d={shape} fill="var(--color-surface-1)" />

                  <!-- Continuous fill: skewed rect (slanted leading edge), clipped -->
                  <g clip-path="url(#gauge-clip)">
                    <rect
                      x="0"
                      y="0"
                      width={fillWidth}
                      height={H}
                      fill={fillColor}
                      transform="skewX({SKEW_DEG})"
                      style="transition: width 300ms ease, fill 300ms ease;"
                    />
                    <!-- Not-yet-sent @tab chips, in the same colour at low
                         opacity: clearly "would be used", not "is used". -->
                    {#if pendingWidth > 0}
                      <rect
                        x={fillWidth}
                        y="0"
                        width={pendingWidth}
                        height={H}
                        fill={fillColor}
                        opacity="0.4"
                        transform="skewX({SKEW_DEG})"
                        style="transition: width 300ms ease, x 300ms ease, fill 300ms ease;"
                      />
                    {/if}
                  </g>

                  <!-- Segment dividers (visual markers only) -->
                  {#each dividers as d}
                    <line
                      x1={d.bx}
                      y1={H}
                      x2={d.tx}
                      y2="0"
                      stroke="var(--color-surface-2)"
                      stroke-width="1.5"
                    />
                  {/each}

                  <!-- Border: outline drawn last so it stays crisp -->
                  <path
                    d={shape}
                    fill="none"
                    stroke="var(--color-border)"
                    stroke-width="1"
                    vector-effect="non-scaling-stroke"
                  />
                </svg>
              </button>
            {/snippet}
          </Popover.Trigger>
        {/snippet}
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          class="z-50 text-[10px] px-2 py-0.5 bg-surface-2 border border-border rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.15)] text-text-primary tabular-nums"
        >
          {#if unavailable}
            —
          {:else if pendingPercent > 0}
            {percent}% → {projectedPercent}%
          {:else}
            {percent}%
          {/if}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>

    <Popover.Portal>
      <Popover.Content
        class="z-50 min-w-50 p-0 bg-surface-1 border border-border rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] animate-[donut-popover-in_120ms_ease-out] dark:bg-surface-2 dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
        sideOffset={6}
        align="end"
        side="top"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <!-- One grid for the whole panel, not one per row: the value column is
             `auto`, so it can only share a right-hand axis across rows if the
             rows are children of the SAME grid. Per-row grids would each size
             that column to their own content and the numbers would not line up.
             Indentation therefore lives on the label cell only, never on the row,
             which is what puts `cached` visually inside `Input`. -->
        {#snippet row(label, value, sub = false)}
          <span
            class="whitespace-nowrap {sub
              ? 'pl-2 text-muted/70'
              : 'text-muted'}">{label}</span
          >
          <span
            class="text-text-primary text-right tabular-nums overflow-hidden text-ellipsis whitespace-nowrap"
            >{value}</span
          >
        {/snippet}

        {#snippet heading(label)}
          <div
            class="col-span-2 mt-1.5 pt-1.5 border-t border-border/60 text-[0.625rem] uppercase tracking-wide text-muted/70"
          >
            {label}
          </div>
        {/snippet}

        <div
          class="grid grid-cols-[1fr_auto] items-baseline gap-x-2 gap-y-1 py-2 px-2.5 min-w-[186px] text-[0.6875rem] leading-[1.4]"
        >
          <span class="text-muted whitespace-nowrap"
            >{$_('chat.context_donut.model', { default: 'Model' })}</span
          >
          <span
            class="text-text-primary text-right overflow-hidden text-ellipsis whitespace-nowrap max-w-[9rem]"
            title={usage?.modelId || ''}
            >{usage?.modelId ? formatModelDisplayName(usage.modelId) : '\u2014'}</span
          >

          {#if usage}
            {@render row(
              $_('chat.context_donut.context_window', {
                default: 'Context window',
              }),
              unavailable
                ? `\u2014 / ${formatK(usage.window)}`
                : `${formatK(snapshot.ctx)} / ${formatK(usage.window)}`,
            )}

            <!-- Input and Output are peers that add up to the line above, so both
                 sit flat. Only `cached` is indented and lower-case: a breakdown of
                 the Input directly above it, not a third peer. -->
            {#if currentTurn}
              {@render row(
                $_('chat.context_donut.input', { default: 'Input' }),
                formatK(currentTurn.input),
              )}
              {#if currentTurn.cache}
                {@render row(
                  `\u2514 ${$_('chat.context_donut.cached_row', { default: 'cached' })}`,
                  formatK(currentTurn.cache),
                  true,
                )}
              {/if}
              {@render row(
                $_('chat.context_donut.output', { default: 'Output' }),
                formatK(currentTurn.output),
              )}
            {/if}
          {/if}

          {#if session.requests > 0}
            {@render heading(
              $_('chat.context_donut.session_turns', {
                values: { count: session.requests },
                default: `Session \u00b7 ${session.requests} turns`,
              }),
            )}
            {@render row(
              $_('chat.context_donut.input', { default: 'Input' }),
              formatK(session.input),
            )}
            {#if session.cached}
              {@render row(
                `\u2514 ${$_('chat.context_donut.cached_row', { default: 'cached' })}`,
                formatK(session.cached),
                true,
              )}
            {/if}
            {@render row(
              $_('chat.context_donut.output', { default: 'Output' }),
              formatK(session.output),
            )}
            {#if cost}
              {@render row(
                $_('chat.context_donut.cost', { default: 'Cost' }),
                `$${cost.toFixed(cost < 0.01 ? 4 : 2)}`,
              )}
            {/if}
          {/if}

          {#if nearLimit}
            <div
              class="col-span-2 mt-1.5 pt-1.5 border-t border-border/60 text-warning"
            >
              {remaining == null
                ? $_('chat.context_donut.near_limit', {
                    values: { percent },
                    default: `Context is ${percent}% full \u2014 start a new chat.`,
                  })
                : $_('chat.context_donut.near_limit_turns', {
                    values: { percent, count: remaining },
                    default: `Context is ${percent}% full, roughly ${remaining} turns left \u2014 start a new chat.`,
                  })}
            </div>
          {/if}
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
</Tooltip.Provider>

<style>
  @keyframes donut-popover-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
