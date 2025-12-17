// @ts-nocheck
// YouTube Transcript Extractor with Multiple Fallback Strategies
// Based on demo-extension-2 logic

// ====== Start: Protobuf VideoMetadata ======
var $Reader = protobuf.Reader,
  $Writer = protobuf.Writer,
  $util = protobuf.util

var $root = protobuf.roots['default'] || (protobuf.roots['default'] = {})

$root.VideoMetadata = (function () {
  function VideoMetadata(properties) {
    if (properties)
      for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]]
  }

  VideoMetadata.prototype.param1 = ''
  VideoMetadata.prototype.param2 = ''

  VideoMetadata.create = function create(properties) {
    return new VideoMetadata(properties)
  }

  VideoMetadata.encode = function encode(message, writer) {
    if (!writer) writer = $Writer.create()
    if (message.param1 != null && Object.hasOwnProperty.call(message, 'param1'))
      writer.uint32(10).string(message.param1)
    if (message.param2 != null && Object.hasOwnProperty.call(message, 'param2'))
      writer.uint32(18).string(message.param2)
    return writer
  }

  VideoMetadata.encodeDelimited = function encodeDelimited(message, writer) {
    return this.encode(message, writer).ldelim()
  }

  VideoMetadata.decode = function decode(reader, length, error) {
    if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
    var end = length === undefined ? reader.len : reader.pos + length,
      message = new $root.VideoMetadata()
    while (reader.pos < end) {
      var tag = reader.uint32()
      if (tag === error) break
      switch (tag >>> 3) {
        case 1:
          message.param1 = reader.string()
          break
        case 2:
          message.param2 = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  }

  VideoMetadata.decodeDelimited = function decodeDelimited(reader) {
    if (!(reader instanceof $Reader)) reader = new $Reader(reader)
    return this.decode(reader, reader.uint32())
  }

  VideoMetadata.verify = function verify(message) {
    if (typeof message !== 'object' || message === null)
      return 'object expected'
    if (message.param1 != null && message.hasOwnProperty('param1'))
      if (!$util.isString(message.param1)) return 'param1: string expected'
    if (message.param2 != null && message.hasOwnProperty('param2'))
      if (!$util.isString(message.param2)) return 'param2: string expected'
    return null
  }

  VideoMetadata.fromObject = function fromObject(object) {
    if (object instanceof $root.VideoMetadata) return object
    var message = new $root.VideoMetadata()
    if (object.param1 != null) message.param1 = String(object.param1)
    if (object.param2 != null) message.param2 = String(object.param2)
    return message
  }

  VideoMetadata.toObject = function toObject(message, options) {
    if (!options) options = {}
    var object = {}
    if (options.defaults) {
      object.param1 = ''
      object.param2 = ''
    }
    if (message.param1 != null && message.hasOwnProperty('param1'))
      object.param1 = message.param1
    if (message.param2 != null && message.hasOwnProperty('param2'))
      object.param2 = message.param2
    return object
  }

  VideoMetadata.prototype.toJSON = function toJSON() {
    return this.constructor.toObject(this, $protobuf.util.toJSONOptions)
  }

  VideoMetadata.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
    if (typeUrlPrefix === undefined) {
      typeUrlPrefix = 'type.googleapis.com'
    }
    return typeUrlPrefix + '/VideoMetadata'
  }

  return VideoMetadata
})()
// ====== End: Protobuf VideoMetadata ======

// ====== Start: Constants and Utilities ======
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const transcriptCache = new Map()

function getCached(key) {
  const cached = transcriptCache.get(key)
  if (cached && Date.now() < cached.expiry) {
    return cached.value
  }
  transcriptCache.delete(key)
  return null
}

function setCache(key, value, ttl = CACHE_TTL) {
  transcriptCache.set(key, {
    value,
    expiry: Date.now() + ttl,
  })
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const formatTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
}

const encodeToBase64 = (metadataObj) => {
  if (
    typeof protobuf === 'undefined' ||
    typeof protobuf.roots === 'undefined' ||
    typeof protobuf.roots['default'].VideoMetadata === 'undefined'
  ) {
    console.error(
      "[YouTubeTranscript] 'protobuf' or 'VideoMetadata' not defined."
    )
    return null
  }
  const VideoMetadata = protobuf.roots['default'].VideoMetadata
  const message = VideoMetadata.create(metadataObj)
  const buffer = VideoMetadata.encode(message).finish()
  let binaryString = ''

  for (let i = 0; i < buffer.byteLength; i++) {
    binaryString += String.fromCharCode(buffer[i])
  }

  return btoa(binaryString)
}

// Get dynamic client version (mimics real YouTube client)
const getRandomClientVersion = () => {
  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0].replace(/-/g, '')
  })
  return `2.${dates[Math.floor(Math.random() * dates.length)]}.00.00`
}

// Extract video ID from URL
const getVideoIdFromUrl = (url) => {
  try {
    const urlObj = new URL(url)
    return urlObj.searchParams.get('v')
  } catch {
    return null
  }
}

// Decode HTML entities
const decodeHtmlEntities = (text) => {
  if (!text) return ''
  const doc = new DOMParser().parseFromString(text, 'text/html')
  return doc.documentElement.textContent || ''
}

// HTTP request options (for non-private videos)
const FETCH_OPTIONS = {
  headers: {
    DNT: '1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    Cookie: '',
  },
  credentials: 'omit',
  mode: 'cors',
  cache: 'no-store',
}
// ====== End: Constants and Utilities ======

// ====== Start: Fetch Video Page and Extract Caption Tracks ======
async function fetchVideoPage(videoId) {
  console.log(`[YouTubeTranscript] Fetching video page for ${videoId}`)
  const url = `https://www.youtube.com/watch?v=${videoId}`
  const response = await fetch(url, FETCH_OPTIONS)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return await response.text()
}

function extractCaptionTracks(html) {
  const captionsMatch = html.match(/"captions":(.*?),"videoDetails":/s)
  if (!captionsMatch) {
    console.log('[YouTubeTranscript] No captions found in page')
    return []
  }
  
  try {
    const captionsConfig = JSON.parse(captionsMatch[1])
    const tracks = captionsConfig?.playerCaptionsTracklistRenderer?.captionTracks || []
    console.log(`[YouTubeTranscript] Found ${tracks.length} caption tracks`)
    return tracks
  } catch (e) {
    console.log('[YouTubeTranscript] Error parsing captions:', e.message)
    return []
  }
}

function extractTitle(html) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/)
  return titleMatch ? decodeHtmlEntities(titleMatch[1]).replace(' - YouTube', '') : ''
}
// ====== End: Fetch Video Page ======

// ====== Start: Strategy 1 - get_transcript API ======
async function fetchViaGetTranscriptAPI(videoId, captionTracks, preferredLang) {
  console.log('[YouTubeTranscript] Strategy 1: get_transcript API')

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('No caption tracks available')
  }

  // Find best matching track
  const preferredLanguages = [preferredLang, 'en']
  const calculateValue = (track) => {
    let value = preferredLanguages.indexOf(track.languageCode)
    value = value === -1 ? 9999 : value
    value += track.kind === 'asr' ? 0.5 : 0
    return value
  }

  const sortedTracks = [...captionTracks].sort(
    (a, b) => calculateValue(a) - calculateValue(b)
  )
  const selectedTrack = sortedTracks[0]
  
  console.log(`[YouTubeTranscript] Selected track: ${selectedTrack.languageCode}, kind: ${selectedTrack.kind || 'manual'}`)

  // Encode params using protobuf - single encoding with video ID and language
  // Note: YouTube's get_transcript expects params encoded once, not nested
  const params = encodeToBase64({
    param1: videoId,
    param2: selectedTrack.languageCode,
  })

  const payload = {
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: getRandomClientVersion(),
      },
    },
    params: params,
  }

  console.log('[YouTubeTranscript] Sending get_transcript request...')
  const response = await fetch(
    'https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    console.log('[YouTubeTranscript] API response error:', errorText.substring(0, 200))
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Navigate to transcript segments in response
  const initialSegments =
    data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer
      ?.content?.transcriptSearchPanelRenderer?.body
      ?.transcriptSegmentListRenderer?.initialSegments

  if (!initialSegments || initialSegments.length === 0) {
    console.log('[YouTubeTranscript] Response structure:', JSON.stringify(data).substring(0, 500))
    throw new Error('No transcript segments found in response')
  }

  console.log(`[YouTubeTranscript] Strategy 1 success: ${initialSegments.length} segments`)

  return initialSegments
    .map((segment) => {
      const renderer = segment?.transcriptSegmentRenderer
      if (!renderer) return null

      const text = renderer?.snippet?.runs?.[0]?.text
      const startMs = renderer?.startMs
      const endMs = renderer?.endMs

      if (!text) return null

      return {
        text: decodeHtmlEntities(text.trim()),
        startTimeMs: startMs ? parseInt(startMs) : null,
        endTimeMs: endMs ? parseInt(endMs) : null,
        startTime: startMs ? formatTime(parseInt(startMs)) : null,
        endTime: endMs ? formatTime(parseInt(endMs)) : null,
      }
    })
    .filter(Boolean)
}
// ====== End: Strategy 1 ======

// ====== Start: Strategy 2 - XML Caption Tracks ======
async function fetchViaXMLCaptionTrack(captionTrack, useCredentials = false, videoId = '') {
  console.log(`[YouTubeTranscript] Strategy 2: Fetching caption XML ${useCredentials ? '(with credentials)' : '(no credentials)'}`)

  if (!captionTrack?.baseUrl) {
    throw new Error('No caption track baseUrl available')
  }

  let url = captionTrack.baseUrl
  
  // Ensure URL uses HTTPS and add fmt=json3 for better parsing
  if (url.startsWith('//')) {
    url = 'https:' + url
  }
  
  // Log the URL for debugging
  console.log(`[YouTubeTranscript] Caption URL: ${url.substring(0, 120)}...`)

  // Try fetching - first without credentials, then with if that fails
  const fetchOptions = useCredentials ? {} : FETCH_OPTIONS
  
  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const xmlText = await response.text()
  
  if (!xmlText || xmlText.trim().length === 0) {
    throw new Error('Empty XML response')
  }
  
  // Check if it's actually XML
  if (!xmlText.includes('<text') && !xmlText.includes('<transcript')) {
    console.log('[YouTubeTranscript] Response preview:', xmlText.substring(0, 200))
    throw new Error('Response is not valid XML')
  }

  return parseXMLTranscript(xmlText)
}

function parseXMLTranscript(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const textElements = doc.querySelectorAll('text')

  if (textElements.length === 0) {
    throw new Error('No text elements in XML')
  }

  console.log(`[YouTubeTranscript] Parsed ${textElements.length} segments from XML`)

  return Array.from(textElements).map((el) => {
    const start = parseFloat(el.getAttribute('start') || '0')
    const dur = parseFloat(el.getAttribute('dur') || '0')
    const text = decodeHtmlEntities(el.textContent || '')

    return {
      text: text.trim(),
      startTimeMs: Math.round(start * 1000),
      endTimeMs: Math.round((start + dur) * 1000),
      startTime: formatTimeFromSeconds(start),
      endTime: formatTimeFromSeconds(start + dur),
    }
  })
}

const formatTimeFromSeconds = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
}
// ====== End: Strategy 2/3 ======

// ====== Start: Strategy 4 - DOM Scraping ======

// CSS to hide the transcript panel during scraping (visually only - content still renders)
const HIDE_PANEL_STYLE_ID = 'yt-transcript-hide-panel'
const HIDE_PANEL_CSS = `
  ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] {
    opacity: 0 !important;
    position: absolute !important;

  }
`

function injectHidePanelStyle() {
  if (document.getElementById(HIDE_PANEL_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = HIDE_PANEL_STYLE_ID
  style.textContent = HIDE_PANEL_CSS
  document.head.appendChild(style)
  console.log('[YouTubeTranscript] Injected hide panel CSS')
}

function removeHidePanelStyle() {
  const style = document.getElementById(HIDE_PANEL_STYLE_ID)
  if (style) {
    style.remove()
    console.log('[YouTubeTranscript] Removed hide panel CSS')
  }
}

async function fetchViaDOMScraping() {
  console.log('[YouTubeTranscript] Strategy 4: DOM Scraping')

  // Check if we're on YouTube
  if (!window.location.hostname.includes('youtube.com')) {
    throw new Error('Not on YouTube')
  }

  // Inject CSS to hide the panel during scraping
  injectHidePanelStyle()

  try {
    // Try to find and click "Show transcript" button
    await tryOpenTranscriptPanel()

    // Wait for transcript segments to appear
    const segmentSelector = '#segments-container ytd-transcript-segment-renderer'
    
    // Wait up to 8 seconds for segments to appear (80 attempts * 100ms)
    let attempts = 0
    let segmentElements = null
    const maxAttempts = 80
    
    console.log('[YouTubeTranscript] Waiting for transcript segments to load...')
    
    while (attempts < maxAttempts) {
      await delay(100)
      segmentElements = document.querySelectorAll(segmentSelector)
      if (segmentElements && segmentElements.length > 0) {
        // Wait a bit more to ensure all segments are loaded
        await delay(500)
        // Re-query to get all segments
        segmentElements = document.querySelectorAll(segmentSelector)
        break
      }
      attempts++
    }

    if (!segmentElements || segmentElements.length === 0) {
      throw new Error('No transcript segments found in DOM')
    }

    console.log(`[YouTubeTranscript] Found ${segmentElements.length} segments in DOM`)

    const segments = []
    segmentElements.forEach((el) => {
      const timestampEl = el.querySelector('.segment-timestamp')
      const textEl = el.querySelector('yt-formatted-string')

      const timestamp = timestampEl?.textContent?.trim() || ''
      const text = textEl?.textContent?.trim() || ''

      if (text) {
        const startSeconds = parseTimestamp(timestamp)
        segments.push({
          text: text,
          startTimeMs: startSeconds * 1000,
          startTime: timestamp || formatTimeFromSeconds(startSeconds),
          endTimeMs: null,
          endTime: null,
        })
      }
    })

    if (segments.length === 0) {
      throw new Error('Could not extract segments from DOM')
    }

    console.log(`[YouTubeTranscript] DOM scraping success: ${segments.length} segments`)

    // Close transcript panel and remove hide CSS
    closeTranscriptPanel()
    removeHidePanelStyle()

    return segments
  } catch (error) {
    // Make sure to clean up CSS even on error
    removeHidePanelStyle()
    closeTranscriptPanel()
    throw error
  }
}

async function tryOpenTranscriptPanel() {
  // Check if transcript panel is already open
  const existingPanel = document.querySelector(
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
  )
  if (existingPanel && existingPanel.offsetParent !== null) {
    console.log('[YouTubeTranscript] Transcript panel already open')
    return
  }

  // First, try to find the "Show transcript" button directly using aria-label
  const directButton = document.querySelector('button[aria-label="Show transcript"]')
  if (directButton) {
    console.log('[YouTubeTranscript] Found "Show transcript" button directly, clicking...')
    directButton.click()
    await delay(1500)
    return
  }

  // Fallback: Try to click "More" to expand description first
  const moreButton = document.querySelector('#expand')
  if (moreButton) {
    console.log('[YouTubeTranscript] Clicking "More" button to expand description')
    moreButton.click()
    await delay(800)
    
    // Try again after expanding
    const transcriptBtn = document.querySelector('button[aria-label="Show transcript"]')
    if (transcriptBtn) {
      console.log('[YouTubeTranscript] Found "Show transcript" button after expanding, clicking...')
      transcriptBtn.click()
      await delay(1500)
      return
    }
  }

  // Fallback: Look for button by text content
  const buttons = document.querySelectorAll('button, ytd-button-renderer, [role="button"]')
  for (const btn of buttons) {
    const text = btn.textContent?.toLowerCase() || ''
    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || ''
    if (text.includes('transcript') || ariaLabel.includes('transcript')) {
      console.log('[YouTubeTranscript] Found transcript button by text/aria, clicking...')
      btn.click()
      await delay(1500)
      return
    }
  }

  console.log('[YouTubeTranscript] Could not find transcript button')
}

function closeTranscriptPanel() {
  try {
    const closeButton = document.querySelector(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] #visibility-button button'
    )
    if (closeButton) {
      closeButton.click()
    }
  } catch {
    // Ignore errors when closing
  }
}

function parseTimestamp(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}
// ====== End: Strategy 4 ======

// ====== Start: Main getCaptions Function ======
const getCaptions = async (videoUrl, languageCode = 'en') => {
  const languageCodeMap = {
    en: 'en',
    de: 'de',
    es: 'es',
    fr: 'fr',
    it: 'it',
    pt_br: 'pt-BR',
    vi: 'vi',
    ru: 'ru',
    ar: 'ar',
    hi: 'hi',
    bn: 'bn',
    zh_cn: 'zh-CN',
    zh_tw: 'zh-TW',
    ja: 'ja',
    ko: 'ko',
    zz: 'en',
  }

  const preferredLang = languageCodeMap[languageCode] || languageCode
  const videoId = getVideoIdFromUrl(videoUrl)

  if (!videoId) {
    console.error('[YouTubeTranscript] Could not extract video ID from URL')
    return ''
  }

  // Check cache first
  const cacheKey = `yt-transcript-${videoId}-${preferredLang}`
  const cached = getCached(cacheKey)
  if (cached) {
    console.log('[YouTubeTranscript] Using cached transcript')
    return cached
  }

  console.log(
    `[YouTubeTranscript] Fetching transcript for ${videoId}, lang: ${preferredLang}`
  )

  // Only use DOM scraping strategy with retry
  const maxRetries = 3
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[YouTubeTranscript] DOM scraping attempt ${attempt}/${maxRetries}`)
      const result = await fetchViaDOMScraping()
      
      if (result && result.length > 0) {
        // Cache successful result
        setCache(cacheKey, result)
        console.log(`[YouTubeTranscript] Success on attempt ${attempt}: ${result.length} segments`)
        return result
      }
    } catch (error) {
      console.log(`[YouTubeTranscript] Attempt ${attempt} failed:`, error.message)
      
      if (attempt < maxRetries) {
        // Wait before retrying
        console.log('[YouTubeTranscript] Waiting 1s before retry...')
        await delay(1000)
      }
    }
  }

  console.log('[YouTubeTranscript] All attempts failed')
  return ''
}
// ====== End: Main getCaptions Function ======
