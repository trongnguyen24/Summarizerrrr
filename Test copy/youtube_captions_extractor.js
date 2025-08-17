/*
 * Lưu ý: Tệp này phụ thuộc vào `protobuf.min.js` và `youtube_video_metadata.js`.
 * Đảm bảo các tệp này được tải trước khi sử dụng hàm `getCaptions`.
 * Ví dụ:
 * <script src="path/to/lib/protobuf.min.js"></script>
 * <script src="path/to/youtube_video_metadata.js"></script>
 * <script src="path/to/youtube_captions_extractor.js"></script>
 */

// Helper function to format time from milliseconds to HH:MM:SS or MM:SS format
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
  // Encode the metadata object to a base64 string using protobuf
  // Đảm bảo protobuf và VideoMetadata đã được định nghĩa toàn cục hoặc import
  if (
    typeof protobuf === 'undefined' ||
    typeof protobuf.roots === 'undefined' ||
    typeof protobuf.roots['default'].VideoMetadata === 'undefined'
  ) {
    console.error(
      "Lỗi: 'protobuf' hoặc 'VideoMetadata' chưa được định nghĩa. Vui lòng đảm bảo 'protobuf.min.js' và 'youtube_video_metadata.js' đã được tải."
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

const getCaptions = async (videoUrl, languageCode) => {
  const languageCodeForCaptions = {
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

  const preferredLanguages = [languageCodeForCaptions[languageCode], 'en']
  const videoId = new URLSearchParams(new URL(videoUrl).search).get('v')
  const videoResponse = await fetch(videoUrl, { credentials: 'omit' })
  const videoBody = await videoResponse.text()
  const captionsConfigJson = videoBody.match(
    /"captions":(.*?),"videoDetails":/s
  )
  let captions = ''

  if (captionsConfigJson) {
    const captionsConfig = JSON.parse(captionsConfigJson[1])

    if (captionsConfig?.playerCaptionsTracklistRenderer?.captionTracks) {
      const captionTracks =
        captionsConfig.playerCaptionsTracklistRenderer.captionTracks

      const calculateValue = (a) => {
        let value = preferredLanguages.indexOf(a.languageCode)
        value = value === -1 ? 9999 : value
        value += a.kind === 'asr' ? 0.5 : 0
        return value
      }

      // Sort the caption tracks by the preferred languages and the kind
      captionTracks.sort((a, b) => {
        const valueA = calculateValue(a)
        const valueB = calculateValue(b)
        return valueA - valueB
      })

      const payload = {
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20991231.01.00',
          },
        },
        params: encodeToBase64({
          param1: videoId,
          param2: encodeToBase64({
            param1: captionTracks[0].kind ? captionTracks[0].kind : '',
            param2: captionTracks[0].languageCode,
          }),
        }),
      }

      const captionsResponse = await fetch(
        'https://www.youtube.com/youtubei/v1/get_transcript',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          credentials: 'omit',
        }
      )

      const captionsJson = await captionsResponse.json()

      const initialSegments =
        captionsJson?.actions?.[0]?.updateEngagementPanelAction?.content
          ?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body
          ?.transcriptSegmentListRenderer?.initialSegments

      let segments = []

      if (initialSegments) {
        for (const segment of initialSegments) {
          const text =
            segment?.transcriptSegmentRenderer?.snippet?.runs?.[0]?.text
          const startTimeMs = segment?.transcriptSegmentRenderer?.startMs
          const endTimeMs = segment?.transcriptSegmentRenderer?.endMs

          if (text) {
            segments.push({
              text: text.trim(),
              startTimeMs: startTimeMs ? parseInt(startTimeMs) : null,
              endTimeMs: endTimeMs ? parseInt(endTimeMs) : null,
              startTime: startTimeMs ? formatTime(parseInt(startTimeMs)) : null,
              endTime: endTimeMs ? formatTime(parseInt(endTimeMs)) : null,
            })
          }
        }

        captions = segments
      }
    } else {
      console.log('No captionTracks found.')
    }
  } else {
    console.log('No captions found.')
  }

  return captions
}
