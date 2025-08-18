// @ts-nocheck
/**
 * Utility để inject CSS styles vào shadow DOM
 * Đặc biệt hữu ích cho các thư viện như OverlayScrollbars
 */

/**
 * Inject OverlayScrollbars CSS và custom theme vào shadow DOM
 * @param {Element} shadowContainer - Shadow DOM container element
 */
export async function injectOverlayScrollbarsStyles(shadowContainer) {
  if (!shadowContainer) return false

  try {
    // Tìm shadow root từ container
    const shadowRoot =
      shadowContainer.shadowRoot || shadowContainer.getRootNode()
    if (!shadowRoot || shadowRoot === document) return false

    // Kiểm tra nếu styles đã được inject trước đó
    if (shadowRoot.querySelector('#overlay-scrollbars-styles')) {
      return true
    }

    // Tạo style element cho OverlayScrollbars CSS
    const styleElement = document.createElement('style')
    styleElement.id = 'overlay-scrollbars-styles'

    // Base OverlayScrollbars styles (extracted từ overlayscrollbars/overlayscrollbars.css)
    const overlayScrollbarsCSS = `
      /* OverlayScrollbars Base Styles */
      .os-theme-custom-app {
        --os-size: 0.5rem;
        --os-padding-perpendicular: 0px;
        --os-padding-axis: 0px;
        --os-track-border-radius: 0px;
        --os-track-bg: none;
        --os-track-bg-hover: none;
        --os-track-bg-active: none;
        --os-track-border: none;
        --os-track-border-hover: none;
        --os-track-border-active: none;
        --os-handle-border-radius: 0.25rem;
        --os-handle-bg: var(--color-border);
        --os-handle-bg-hover: var(--color-text-secondary);
        --os-handle-bg-active: var(--color-text-primary);
        --os-handle-border: none;
        --os-handle-border-hover: none;
        --os-handle-border-active: none;
        --os-handle-min-size: 2rem;
        --os-handle-max-size: none;
        --os-handle-perpendicular-size: 100%;
        --os-handle-perpendicular-size-hover: 100%;
        --os-handle-perpendicular-size-active: 100%;
        --os-handle-interactive-area-offset: 0px;
      }

      .os-scrollbar {
        contain: size layout style;
        contain: size layout;
        z-index: 1;
        transition: opacity 0.3s ease;
      }

      .os-scrollbar-hidden {
        opacity: 0;
      }

      .os-scrollbar-track {
        position: relative;
        padding: var(--os-padding-perpendicular, 0) var(--os-padding-axis, 0);
        border: var(--os-track-border, none);
        border-radius: var(--os-track-border-radius, 0);
        background: var(--os-track-bg, none);
      }

      .os-scrollbar-track:hover {
        border: var(--os-track-border-hover, var(--os-track-border, none));
        background: var(--os-track-bg-hover, var(--os-track-bg, none));
      }

      .os-scrollbar-track:active {
        border: var(--os-track-border-active, var(--os-track-border-hover, var(--os-track-border, none)));
        background: var(--os-track-bg-active, var(--os-track-bg-hover, var(--os-track-bg, none)));
      }

      .os-scrollbar-handle {
        position: relative;
        border-radius: var(--os-handle-border-radius, 0);
        background: var(--os-handle-bg);
        border: var(--os-handle-border, none);
        transition: background-color 0.3s ease, border-color 0.3s ease;
      }

      .os-scrollbar-handle:hover {
        background: var(--os-handle-bg-hover, var(--os-handle-bg));
        border: var(--os-handle-border-hover, var(--os-handle-border, none));
      }

      .os-scrollbar-handle:active {
        background: var(--os-handle-bg-active, var(--os-handle-bg-hover, var(--os-handle-bg)));
        border: var(--os-handle-border-active, var(--os-handle-border-hover, var(--os-handle-border, none)));
      }

      .os-scrollbar-horizontal {
        height: var(--os-size);
        left: 0;
        right: 0;
        bottom: 0;
      }

      .os-scrollbar-vertical {
        width: var(--os-size);
        top: 0;
        bottom: 0;
        right: 0;
      }

      .os-scrollbar-horizontal .os-scrollbar-handle {
        min-width: var(--os-handle-min-size);
        max-width: var(--os-handle-max-size, none);
        height: var(--os-handle-perpendicular-size, 100%);
      }

      .os-scrollbar-vertical .os-scrollbar-handle {
        min-height: var(--os-handle-min-size);
        max-height: var(--os-handle-max-size, none);
        width: var(--os-handle-perpendicular-size, 100%);
      }

      .os-scrollbar-horizontal:hover .os-scrollbar-handle {
        height: var(--os-handle-perpendicular-size-hover, var(--os-handle-perpendicular-size, 100%));
      }

      .os-scrollbar-vertical:hover .os-scrollbar-handle {
        width: var(--os-handle-perpendicular-size-hover, var(--os-handle-perpendicular-size, 100%));
      }

      .os-scrollbar-horizontal:active .os-scrollbar-handle {
        height: var(--os-handle-perpendicular-size-active, var(--os-handle-perpendicular-size-hover, var(--os-handle-perpendicular-size, 100%)));
      }

      .os-scrollbar-vertical:active .os-scrollbar-handle {
        width: var(--os-handle-perpendicular-size-active, var(--os-handle-perpendicular-size-hover, var(--os-handle-perpendicular-size, 100%)));
      }

      /* Host element styles */
      [data-overlayscrollbars-host] {
        position: relative;
      }

      [data-overlayscrollbars-contents] {
        box-sizing: border-box;
      }

      [data-overlayscrollbars-viewport] {
        -ms-overflow-style: scrollbar !important;
        scrollbar-width: none !important;
      }

      [data-overlayscrollbars-viewport]::-webkit-scrollbar,
      [data-overlayscrollbars-viewport]::-webkit-scrollbar-corner {
        appearance: none !important;
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .os-theme-custom-app {
          --os-size: 0.5rem;
          --os-handle-min-size: 1.5rem;
        }
      }

      /* Dark theme adjustments */
      .dark .os-theme-custom-app {
        --os-handle-bg: var(--color-border);
        --os-handle-bg-hover: var(--color-text-secondary);
        --os-handle-bg-active: var(--color-text-primary);
      }
    `

    styleElement.textContent = overlayScrollbarsCSS

    // Insert styles vào shadow DOM
    if (shadowRoot.adoptedStyleSheets && window.CSSStyleSheet) {
      // Modern approach với adoptedStyleSheets (preferred)
      try {
        const styleSheet = new CSSStyleSheet()
        styleSheet.replaceSync(overlayScrollbarsCSS)
        shadowRoot.adoptedStyleSheets = [
          ...(shadowRoot.adoptedStyleSheets || []),
          styleSheet,
        ]
      } catch (e) {
        // Fallback to appendChild method
        shadowRoot.appendChild(styleElement)
      }
    } else {
      // Fallback cho older browsers
      shadowRoot.appendChild(styleElement)
    }

    console.log('[OverlayScrollbars] CSS injected successfully into shadow DOM')
    return true
  } catch (error) {
    console.error(
      '[OverlayScrollbars] Failed to inject CSS into shadow DOM:',
      error
    )
    return false
  }
}

/**
 * Utility để inject bất kỳ CSS nào vào shadow DOM
 * @param {Element} shadowContainer - Shadow DOM container element
 * @param {string} css - CSS content to inject
 * @param {string} id - Unique ID for the style element
 */
export function injectCustomCSS(shadowContainer, css, id) {
  if (!shadowContainer || !css) return false

  try {
    const shadowRoot =
      shadowContainer.shadowRoot || shadowContainer.getRootNode()
    if (!shadowRoot || shadowRoot === document) return false

    // Kiểm tra nếu đã tồn tại
    if (shadowRoot.querySelector(`#${id}`)) {
      return true
    }

    const styleElement = document.createElement('style')
    styleElement.id = id
    styleElement.textContent = css

    shadowRoot.appendChild(styleElement)
    return true
  } catch (error) {
    console.error(
      `[ShadowDOMStylesInjector] Failed to inject CSS with ID ${id}:`,
      error
    )
    return false
  }
}
