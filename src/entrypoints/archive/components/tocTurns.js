// Turn grouping shared by the archive chat TOCs (floating `TOCArchive` and
// `TOCSidebar`). A turn = one user message plus the headings of the assistant
// messages after it, keyed by `data-message-id` so ids stay stable across
// re-runs.

const TURN_LABEL_MAX = 80

// Strip emoji/icons and collapse whitespace, the same way heading text is cleaned.
function cleanText(raw) {
  return (raw || '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Label for a user message's turn. The bubble is absent while the message is
// being edited, so fall back to the cached label (and then to `Turn N`).
// `labelCache` is a per-component, deliberately non-reactive Map.
function resolveTurnLabel(el, id, position, labelCache) {
  const bubble = el.querySelector('[data-testid="chat-user-bubble"]')
  if (bubble) {
    const text = cleanText(bubble.innerText)
    if (text) {
      const label =
        text.length > TURN_LABEL_MAX
          ? text.slice(0, TURN_LABEL_MAX - 1).trimEnd() + '…'
          : text
      labelCache.set(id, label)
      return label
    }
  }
  return labelCache.get(id) || `Turn ${position}`
}

// Groups the flat `flatHeadings` into turns, in document order.
export function buildTurns(targetDiv, flatHeadings, labelCache) {
  const headingById = new Map(flatHeadings.map((h) => [h.id, h]))
  const built = []
  let current = null

  const messages = targetDiv.querySelectorAll('[data-message-role]')
  for (const el of messages) {
    const role = el.dataset.messageRole
    const id = el.dataset.messageId
    if (!id) continue

    if (role === 'user') {
      current = {
        id,
        label: resolveTurnLabel(el, id, built.length + 1, labelCache),
        headings: [],
      }
      built.push(current)
    } else if (role === 'assistant') {
      for (const heading of el.querySelectorAll('h2,h3,h4')) {
        const entry = headingById.get(heading.id)
        if (!entry) continue
        if (!current) {
          // Headings before the first user message: leading turn anchored here.
          current = { id, label: 'Turn 1', headings: [] }
          built.push(current)
        }
        current.headings.push(entry)
      }
    }
  }
  return built
}

// Active turn = last user message that has passed `threshold`; before the
// first user message (leading turn) fall back to the first turn.
export function findActiveTurnId(targetDiv, turns, threshold) {
  let currentTurnId = null
  const userElements = targetDiv.querySelectorAll('[data-message-role="user"]')
  for (const el of userElements) {
    if (el.getBoundingClientRect().top <= threshold) {
      currentTurnId = el.dataset.messageId
    } else {
      break
    }
  }
  return currentTurnId ?? turns[0]?.id ?? null
}

export function scrollToTurn(targetDivId, turn) {
  const targetDiv = document.getElementById(targetDivId)
  if (!targetDiv) return
  const element = targetDiv.querySelector(
    `[data-message-id="${CSS.escape(turn.id)}"]`,
  )
  if (!element) return
  // Keep the user message clear of the top edge after scrolling.
  element.style.scrollMarginTop = '80px'
  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  element.classList.add('animate-pulse')
  setTimeout(() => {
    element.classList.remove('animate-pulse')
  }, 4000)
}
