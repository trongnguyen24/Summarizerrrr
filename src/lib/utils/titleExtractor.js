/**
 * Robust title extractor for web pages, with special handling for YouTube
 * backgound tabs where DOM might not be fully loaded.
 */
export function extractPageTitle() {
  try {
    // 1. Try Meta Tags first (loaded earliest)
    const metaTitle = 
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.querySelector('meta[name="title"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');

    if (metaTitle && metaTitle !== 'YouTube') {
      return cleanTitle(metaTitle);
    }

    // 2. YouTube Specific Extraction
    const isYouTube = window.location.hostname.includes('youtube.com');
    if (isYouTube) {
      // Try to get from YouTube's internal data objects
      // These are often available even if the DOM element isn't rendered yet
      const titleFromPlayerResponse = window.ytInitialPlayerResponse?.videoDetails?.title;
      if (titleFromPlayerResponse) return cleanTitle(titleFromPlayerResponse);

      const titleFromData = window.ytInitialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.title?.runs?.[0]?.text;
      if (titleFromData) return cleanTitle(titleFromData);

      // Try specific YouTube DOM elements
      const youtubeTitleEl = document.querySelector('h1.ytd-video-primary-info-renderer') || 
                             document.querySelector('yt-formatted-string.ytd-video-primary-info-renderer');
      if (youtubeTitleEl?.innerText) return cleanTitle(youtubeTitleEl.innerText);
    }

    // 3. Fallback to document.title
    if (document.title && document.title !== 'YouTube') {
      return cleanTitle(document.title);
    }

    // 4. Last resort
    const h1 = document.querySelector('h1');
    if (h1?.innerText) return cleanTitle(h1.innerText);

    return 'Unknown Title';
  } catch (error) {
    console.error('[TitleExtractor] Error extracting title:', error);
    return document.title || 'Unknown Title';
  }
}

/**
 * Clean up common title suffixes and whitespace
 */
function cleanTitle(title) {
  if (!title) return '';
  
  return title
    .replace(/\s*-\s*YouTube$/, '')
    .replace(/^\s*\([\d\+]+\)\s*/, '') // Remove notification count like (1) or (18) or (9+)
    .trim();
}
