/**
 * Accessibility Tree Content Extractor for Summarizerrrr
 * Inspired by Claude Extension's approach
 * 
 * Features:
 * - Smart content extraction using semantic HTML
 * - Filters out noise (ads, navigation, tracking)
 * - Returns structured, clean content
 * - Much smaller output than innerText
 */

(function() {
  'use strict';

  /**
   * Get semantic role of element
   */
  function getRole(element) {
    const role = element.getAttribute('role');
    if (role) return role;

    const tagName = element.tagName.toLowerCase();
    const inputType = element.getAttribute('type');

    const roleMap = {
      a: 'link',
      button: 'button',
      h1: 'heading', h2: 'heading', h3: 'heading',
      h4: 'heading', h5: 'heading', h6: 'heading',
      p: 'paragraph',
      article: 'article',
      section: 'section',
      main: 'main',
      nav: 'navigation',
      header: 'banner',
      footer: 'contentinfo',
      aside: 'complementary',
      blockquote: 'blockquote',
      ul: 'list',
      ol: 'list',
      li: 'listitem',
      img: 'image',
      figure: 'figure',
      figcaption: 'caption',
      table: 'table',
      pre: 'code',
      code: 'code'
    };

    if (tagName === 'input') {
      return inputType === 'submit' || inputType === 'button' ? 'button' : 'textbox';
    }

    return roleMap[tagName] || null;
  }

  /**
   * Check if element is visible
   */
  function isVisible(element) {
    if (!element.offsetParent && element.tagName !== 'BODY') return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' 
        && style.visibility !== 'hidden'
        && style.opacity !== '0';
  }

  /**
   * Check if element should be skipped entirely
   */
  function shouldSkip(element) {
    const tagName = element.tagName.toLowerCase();
    
    // Skip non-content elements
    const skipTags = [
      'script', 'style', 'meta', 'link', 'noscript',
      'svg', 'path', 'iframe', 'embed', 'object',
      'input', 'button', 'select', 'textarea', 'form'
    ];
    if (skipTags.includes(tagName)) return true;

    // Skip hidden elements
    if (element.getAttribute('aria-hidden') === 'true') return true;
    if (element.hasAttribute('hidden')) return true;

    // Skip navigation, footer, sidebar (usually not main content)
    const skipRoles = ['navigation', 'banner', 'contentinfo', 'complementary', 'menu', 'menubar'];
    const role = element.getAttribute('role');
    if (skipRoles.includes(role)) return true;

    // Skip common non-content classes
    const className = element.className?.toLowerCase?.() || '';
    const skipClasses = [
      'nav', 'menu', 'sidebar', 'footer', 'header', 
      'ad', 'advertisement', 'social', 'share',
      'related', 'recommended', 'popup', 'modal', 'cookie',
      'newsletter', 'subscribe'
    ];
    if (skipClasses.some(c => className.includes(c))) return true;

    // Skip elements by ID
    const id = element.id?.toLowerCase?.() || '';
    if (skipClasses.some(c => id.includes(c))) return true;

    return false;
  }

  /**
   * Check if element is main content container
   */
  function isMainContent(element) {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const className = element.className?.toLowerCase?.() || '';
    const id = element.id?.toLowerCase?.() || '';

    // Main content indicators
    if (tagName === 'main' || role === 'main') return true;
    if (tagName === 'article') return true;
    
    // Common main content class/id patterns
    const mainPatterns = ['content', 'article', 'post', 'entry', 'main', 'body'];
    if (mainPatterns.some(p => className.includes(p) || id.includes(p))) return true;

    return false;
  }

  /**
   * Get text content of element (direct text nodes only)
   */
  function getDirectText(element) {
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  /**
   * Get heading level
   */
  function getHeadingLevel(element) {
    const match = element.tagName.match(/^H([1-6])$/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract structured content from page
   */
  window.__extractContent = function(options = {}) {
    const {
      includeHeadings = true,
      includeParagraphs = true,
      includeListItems = true,
      includeBlockquotes = true,
      includeCode = true,
      includeImages = true,
      maxLength = 100000,
      format = 'markdown' // 'markdown' | 'text' | 'structured'
    } = options;

    const content = [];
    let totalLength = 0;

    /**
     * Process element and extract content
     */
    function processElement(element, depth = 0) {
      if (totalLength >= maxLength) return;
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
      if (!isVisible(element)) return;
      if (shouldSkip(element)) return;

      const tagName = element.tagName.toLowerCase();
      const role = getRole(element);

      // Headings
      if (includeHeadings && role === 'heading') {
        const level = getHeadingLevel(element);
        const text = element.textContent.trim();
        if (text) {
          if (format === 'markdown') {
            content.push('#'.repeat(level) + ' ' + text);
          } else if (format === 'structured') {
            content.push({ type: 'heading', level, text });
          } else {
            content.push(text);
          }
          totalLength += text.length;
        }
        return; // Don't process children of headings
      }

      // Paragraphs
      if (includeParagraphs && tagName === 'p') {
        const text = element.textContent.trim();
        if (text && text.length > 20) { // Skip very short paragraphs
          if (format === 'structured') {
            content.push({ type: 'paragraph', text });
          } else {
            content.push(text);
          }
          totalLength += text.length;
        }
        return;
      }

      // Blockquotes
      if (includeBlockquotes && tagName === 'blockquote') {
        const text = element.textContent.trim();
        if (text) {
          if (format === 'markdown') {
            content.push('> ' + text.split('\n').join('\n> '));
          } else if (format === 'structured') {
            content.push({ type: 'blockquote', text });
          } else {
            content.push(text);
          }
          totalLength += text.length;
        }
        return;
      }

      // Code blocks
      if (includeCode && (tagName === 'pre' || tagName === 'code')) {
        const text = element.textContent.trim();
        if (text) {
          if (format === 'markdown') {
            const lang = element.className.match(/language-(\w+)/)?.[1] || '';
            content.push('```' + lang + '\n' + text + '\n```');
          } else if (format === 'structured') {
            content.push({ type: 'code', text });
          } else {
            content.push(text);
          }
          totalLength += text.length;
        }
        return;
      }

      // List items
      if (includeListItems && tagName === 'li') {
        const text = element.textContent.trim();
        if (text) {
          if (format === 'markdown') {
            content.push('- ' + text);
          } else if (format === 'structured') {
            content.push({ type: 'listitem', text });
          } else {
            content.push(text);
          }
          totalLength += text.length;
        }
        return;
      }

      // Images with alt text
      if (includeImages && tagName === 'img') {
        const alt = element.getAttribute('alt')?.trim();
        if (alt && alt.length > 5) {
          if (format === 'markdown') {
            content.push(`[Image: ${alt}]`);
          } else if (format === 'structured') {
            content.push({ type: 'image', alt });
          } else {
            content.push(`[Image: ${alt}]`);
          }
          totalLength += alt.length;
        }
        return;
      }

      // Recurse into children
      for (const child of element.children) {
        processElement(child, depth + 1);
      }
    }

    // Try to find main content first
    const mainContent = document.querySelector('main, [role="main"], article, .content, #content, .post, .article');
    
    if (mainContent) {
      processElement(mainContent);
    } else {
      // Fallback to body
      processElement(document.body);
    }

    // Format output
    if (format === 'structured') {
      return {
        title: document.title,
        url: window.location.href,
        content: content
      };
    }

    return {
      title: document.title,
      url: window.location.href,
      content: content.join('\n\n')
    };
  };

  /**
   * Quick method for summarization (most common use case)
   */
  window.__getPageContent = function() {
    const result = window.__extractContent({
      format: 'text',
      maxLength: 80000
    });
    return result.content;
  };

  /**
   * Get content as markdown
   */
  window.__getPageMarkdown = function() {
    const result = window.__extractContent({
      format: 'markdown',
      maxLength: 80000
    });
    return `# ${result.title}\n\n${result.content}`;
  };

})();