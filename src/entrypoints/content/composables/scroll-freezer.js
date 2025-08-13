// iOS-safe body scroll freezer with ref-count - extension-friendly version
let lockCount = 0
let saved = null

const docEl = () => document.documentElement
const bodyEl = () => document.body

function getScrollbarGap() {
  return window.innerWidth - docEl().clientWidth // vertical scrollbar width
}

export function lockBodyScroll() {
  lockCount++
  if (lockCount > 1) return

  const x = window.scrollX || window.pageXOffset
  const y = window.scrollY || window.pageYOffset

  const body = bodyEl()
  const root = docEl()

  saved = {
    x,
    y,
    body: {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      touchAction: body.style.touchAction,
    },
    root: {
      overflow: root.style.overflow,
      scrollbarGutter: root.style.scrollbarGutter,
    },
  }

  // compensate layout shift when scrollbar disappears
  const gap = getScrollbarGap()
  if (gap > 0) {
    const pr = parseFloat(getComputedStyle(body).paddingRight) || 0
    body.style.paddingRight = pr + gap + 'px'
  }

  // freeze viewport (extension-safe) - avoid transform to not affect shadow DOM
  // root.style.overflow = 'hidden'
  root.style.scrollbarGutter = 'stable'
  body.style.position = 'fixed'
  body.style.top = `-${y}px`
  body.style.left = `-${x}px`
  body.style.width = '100%'
  body.style.overflow = 'hidden'
  body.style.touchAction = 'none' // Better mobile touch handling
}

export function unlockBodyScroll() {
  if (lockCount === 0) return
  lockCount--
  if (lockCount > 0) return

  const body = bodyEl()
  const root = docEl()

  const s = saved || {
    x: 0,
    y: 0,
    body: {
      position: '',
      top: '',
      left: '',
      width: '',
      overflow: '',
      paddingRight: '',
      touchAction: '',
    },
    root: { overflow: '', scrollbarGutter: '' },
  }

  body.style.position = s.body.position || ''
  body.style.top = s.body.top || ''
  body.style.left = s.body.left || ''
  body.style.width = s.body.width || ''
  body.style.overflow = s.body.overflow || ''
  body.style.paddingRight = s.body.paddingRight || ''
  body.style.touchAction = s.body.touchAction || ''
  root.style.overflow = s.root.overflow || ''
  root.style.scrollbarGutter = s.root.scrollbarGutter || ''

  saved = null

  // restore exact scroll position
  window.scrollTo(s.x, s.y)
}

export function isBodyLocked() {
  return lockCount > 0
}
