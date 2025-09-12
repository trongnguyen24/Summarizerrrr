// @ts-nocheck
// This file is a combination of youtube_video_metadata.js and youtube_captions_extractor.js

// ====== Start: youtube_video_metadata.js ======
// Common aliases
var $Reader = protobuf.Reader,
  $Writer = protobuf.Writer,
  $util = protobuf.util

// Exported root namespace
var $root = protobuf.roots['default'] || (protobuf.roots['default'] = {})

$root.VideoMetadata = (function () {
  /**
   * Properties of a VideoMetadata.
   * @exports IVideoMetadata
   * @interface IVideoMetadata
   * @property {string|null} [param1] VideoMetadata param1
   * @property {string|null} [param2] VideoMetadata param2
   */

  /**
   * Constructs a new VideoMetadata.
   * @exports VideoMetadata
   * @classdesc Represents a VideoMetadata.
   * @implements IVideoMetadata
   * @constructor
   * @param {IVideoMetadata=} [properties] Properties to set
   */
  function VideoMetadata(properties) {
    if (properties)
      for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]]
  }

  /**
   * VideoMetadata param1.
   * @member {string} param1
   * @memberof VideoMetadata
   * @instance
   */
  VideoMetadata.prototype.param1 = ''

  /**
   * VideoMetadata param2.
   * @member {string} param2
   * @memberof VideoMetadata
   * @instance
   */
  VideoMetadata.prototype.param2 = ''

  /**
   * Creates a new VideoMetadata instance using the specified properties.
   * @function create
   * @memberof VideoMetadata
   * @static
   * @param {IVideoMetadata=} [properties] Properties to set
   * @returns {VideoMetadata} VideoMetadata instance
   */
  VideoMetadata.create = function create(properties) {
    return new VideoMetadata(properties)
  }

  /**
   * Encodes the specified VideoMetadata message. Does not implicitly {@link VideoMetadata.verify|verify} messages.
   * @function encode
   * @memberof VideoMetadata
   * @static
   * @param {IVideoMetadata} message VideoMetadata message or plain object to encode
   * @param {$protobuf.Writer} [writer] Writer to encode to
   * @returns {$protobuf.Writer} Writer
   */
  VideoMetadata.encode = function encode(message, writer) {
    if (!writer) writer = $Writer.create()
    if (message.param1 != null && Object.hasOwnProperty.call(message, 'param1'))
      writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.param1)
    if (message.param2 != null && Object.hasOwnProperty.call(message, 'param2'))
      writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.param2)
    return writer
  }

  /**
   * Encodes the specified VideoMetadata message, length delimited. Does not implicitly {@link VideoMetadata.verify|verify} messages.
   * @function encodeDelimited
   * @memberof VideoMetadata
   * @static
   * @param {IVideoMetadata} message VideoMetadata message or plain object to encode
   * @param {$protobuf.Writer} [writer] Writer to encode to
   * @returns {$protobuf.Writer} Writer
   */
  VideoMetadata.encodeDelimited = function encodeDelimited(message, writer) {
    return this.encode(message, writer).ldelim()
  }

  /**
   * Decodes a VideoMetadata message from the specified reader or buffer.
   * @function decode
   * @memberof VideoMetadata
   * @static
   * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
   * @param {number} [length] Message length if known beforehand
   * @returns {VideoMetadata} VideoMetadata
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  VideoMetadata.decode = function decode(reader, length, error) {
    if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
    var end = length === undefined ? reader.len : reader.pos + length,
      message = new $root.VideoMetadata()
    while (reader.pos < end) {
      var tag = reader.uint32()
      if (tag === error) break
      switch (tag >>> 3) {
        case 1: {
          message.param1 = reader.string()
          break
        }
        case 2: {
          message.param2 = reader.string()
          break
        }
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  }

  /**
   * Decodes a VideoMetadata message from the specified reader or buffer, length delimited.
   * @function decodeDelimited
   * @memberof VideoMetadata
   * @static
   * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
   * @returns {VideoMetadata} VideoMetadata
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  VideoMetadata.decodeDelimited = function decodeDelimited(reader) {
    if (!(reader instanceof $Reader)) reader = new $Reader(reader)
    return this.decode(reader, reader.uint32())
  }

  /**
   * Verifies a VideoMetadata message.
   * @function verify
   * @memberof VideoMetadata
   * @static
   * @param {Object.<string,*>} message Plain object to verify
   * @returns {string|null} `null` if valid, otherwise the reason why it is not
   */
  VideoMetadata.verify = function verify(message) {
    if (typeof message !== 'object' || message === null)
      return 'object expected'
    if (message.param1 != null && message.hasOwnProperty('param1'))
      if (!$util.isString(message.param1)) return 'param1: string expected'
    if (message.param2 != null && message.hasOwnProperty('param2'))
      if (!$util.isString(message.param2)) return 'param2: string expected'
    return null
  }

  /**
   * Creates a VideoMetadata message from a plain object. Also converts values to their respective internal types.
   * @function fromObject
   * @memberof VideoMetadata
   * @static
   * @param {Object.<string,*>} object Plain object
   * @returns {VideoMetadata} VideoMetadata
   */
  VideoMetadata.fromObject = function fromObject(object) {
    if (object instanceof $root.VideoMetadata) return object
    var message = new $root.VideoMetadata()
    if (object.param1 != null) message.param1 = String(object.param1)
    if (object.param2 != null) message.param2 = String(object.param2)
    return message
  }

  /**
   * Creates a plain object from a VideoMetadata message. Also converts values to other types if specified.
   * @function toObject
   * @memberof VideoMetadata
   * @static
   * @param {VideoMetadata} message VideoMetadata
   * @param {$protobuf.IConversionOptions} [options] Conversion options
   * @returns {Object.<string,*>} Plain object
   */
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

  /**
   * Converts this VideoMetadata to JSON.
   * @function toJSON
   * @memberof VideoMetadata
   * @instance
   * @returns {Object.<string,*>} JSON object
   */
  VideoMetadata.prototype.toJSON = function toJSON() {
    return this.constructor.toObject(this, $protobuf.util.toJSONOptions)
  }

  /**
   * Gets the default type url for VideoMetadata
   * @function getTypeUrl
   * @memberof VideoMetadata
   * @static
   * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
   * @returns {string} The default type url
   */
  VideoMetadata.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
    if (typeUrlPrefix === undefined) {
      typeUrlPrefix = 'type.googleapis.com'
    }
    return typeUrlPrefix + '/VideoMetadata'
  }

  return VideoMetadata
})()
// ====== End: youtube_video_metadata.js ======

// ====== Start: youtube_captions_extractor.js ======
/*
 * Lưu ý: Tệp này phụ thuộc vào `protobuf.min.js` và mã `youtube_video_metadata.js` ở trên.
 * Đảm bảo protobuf.min.js được tải trước khi sử dụng hàm `getCaptions`.
 * Ví dụ:
 * <script src="path/to/lib/protobuf.min.js"></script>
 * <script src="path/to/youtube_transcript.js"></script>
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
      "Lỗi: 'protobuf' hoặc 'VideoMetadata' chưa được định nghĩa. Vui lòng đảm bảo 'protobuf.min.js' đã được tải."
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
// ====== End: youtube_captions_extractor.js ======
