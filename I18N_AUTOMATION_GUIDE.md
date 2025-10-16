# Hướng dẫn tự động tạo file i18n cho Chrome Web Store

## Script tự động tạo file messages.json

### File: scripts/generate-i18n.js

```javascript
// @ts-nocheck
const fs = require('fs')
const path = require('path')

// Danh sách ngôn ngữ cần hỗ trợ
const languages = {
  // Ngôn ngữ đã có
  en: { name: 'English', chromeCode: 'en' },
  vi: { name: 'Vietnamese', chromeCode: 'vi' },
  es: { name: 'Spanish', chromeCode: 'es' },
  zh_CN: { name: 'Chinese (Simplified)', chromeCode: 'zh_CN' },
  de: { name: 'German', chromeCode: 'de' },
  fr: { name: 'French', chromeCode: 'fr' },
  ja: { name: 'Japanese', chromeCode: 'ja' },
  ko: { name: 'Korean', chromeCode: 'ko' },

  // Châu Âu
  it: { name: 'Italian', chromeCode: 'it' },
  pt: { name: 'Portuguese', chromeCode: 'pt' },
  pt_BR: { name: 'Portuguese (Brazil)', chromeCode: 'pt_BR' },
  ru: { name: 'Russian', chromeCode: 'ru' },
  nl: { name: 'Dutch', chromeCode: 'nl' },
  pl: { name: 'Polish', chromeCode: 'pl' },
  tr: { name: 'Turkish', chromeCode: 'tr' },
  sv: { name: 'Swedish', chromeCode: 'sv' },
  da: { name: 'Danish', chromeCode: 'da' },
  no: { name: 'Norwegian', chromeCode: 'no' },
  fi: { name: 'Finnish', chromeCode: 'fi' },
  el: { name: 'Greek', chromeCode: 'el' },
  cs: { name: 'Czech', chromeCode: 'cs' },
  hu: { name: 'Hungarian', chromeCode: 'hu' },
  ro: { name: 'Romanian', chromeCode: 'ro' },
  bg: { name: 'Bulgarian', chromeCode: 'bg' },

  // Châu Á
  zh_TW: { name: 'Chinese (Traditional)', chromeCode: 'zh_TW' },
  th: { name: 'Thai', chromeCode: 'th' },
  id: { name: 'Indonesian', chromeCode: 'id' },
  ms: { name: 'Malay', chromeCode: 'ms' },
  tl: { name: 'Filipino', chromeCode: 'tl' },
  hi: { name: 'Hindi', chromeCode: 'hi' },
  bn: { name: 'Bengali', chromeCode: 'bn' },
  ta: { name: 'Tamil', chromeCode: 'ta' },
  te: { name: 'Telugu', chromeCode: 'te' },
  mr: { name: 'Marathi', chromeCode: 'mr' },
  gu: { name: 'Gujarati', chromeCode: 'gu' },
  kn: { name: 'Kannada', chromeCode: 'kn' },
  ml: { name: 'Malayalam', chromeCode: 'ml' },
  pa: { name: 'Punjabi', chromeCode: 'pa' },
  ur: { name: 'Urdu', chromeCode: 'ur' },

  // Trung Đông
  ar: { name: 'Arabic', chromeCode: 'ar' },
  he: { name: 'Hebrew', chromeCode: 'he' },
  fa: { name: 'Persian', chromeCode: 'fa' },
  az: { name: 'Azerbaijani', chromeCode: 'az' },
  hy: { name: 'Armenian', chromeCode: 'hy' },

  // Châu Phi
  sw: { name: 'Swahili', chromeCode: 'sw' },
  af: { name: 'Afrikaans', chromeCode: 'af' },
  zu: { name: 'Zulu', chromeCode: 'zu' },

  // Châu Mỹ
  ca: { name: 'Catalan', chromeCode: 'ca' },
  eu: { name: 'Basque', chromeCode: 'eu' },
  gl: { name: 'Galician', chromeCode: 'gl' },
  is: { name: 'Icelandic', chromeCode: 'is' },
  ga: { name: 'Irish', chromeCode: 'ga' },
  cy: { name: 'Welsh', chromeCode: 'cy' },
  gd: { name: 'Scottish Gaelic', chromeCode: 'gd' },
  sq: { name: 'Albanian', chromeCode: 'sq' },
}

// Template cho messages.json
const messagesTemplate = {
  extensionName: {
    message: 'Summarizerrrr',
    description: 'Name of the extension',
  },
  extensionDescription: {
    message:
      'Extension helps you summarize for YouTube, Udemy, Coursera, any websites. Crafted with superior UI/UX design.',
    description: 'Description of the extension',
  },
  actionTitle: {
    message: 'Click to Open Summarizerrrr',
    description: 'Tooltip text when hovering over the extension icon',
  },
}

// Bản dịch cho các ngôn ngữ (có thể sử dụng Google Translate API hoặc dịch thủ công)
const translations = {
  en: {
    extensionName: 'Summarizerrrr',
    extensionDescription:
      'Extension helps you summarize for YouTube, Udemy, Coursera, any websites. Crafted with superior UI/UX design.',
    actionTitle: 'Click to Open Summarizerrrr',
  },
  vi: {
    extensionName: 'Summarizerrrr',
    extensionDescription:
      'Tiện ích giúp bạn tóm tắt cho YouTube, Udemy, Coursera và bất kỳ trang web nào. Được chế tác với thiết kế UI/UX vượt trội.',
    actionTitle: 'Nhấp để mở Summarizerrrr',
  },
  es: {
    extensionName: 'Summarizerrrr',
    extensionDescription:
      'Extensión que te ayuda a resumir para YouTube, Udemy, Coursera, cualquier sitio web. Diseñada con un diseño de UI/UX superior.',
    actionTitle: 'Haz clic para abrir Summarizerrrr',
  },
  // ... thêm các ngôn ngữ khác
}

// Hàm tạo thư mục nếu chưa tồn tại
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// Hàm tạo file messages.json cho một ngôn ngữ
function createMessagesFile(langCode, translation) {
  const dirPath = path.join(__dirname, '../public/_locales', langCode)
  ensureDir(dirPath)

  const messages = {
    extensionName: {
      message: translation.extensionName,
      description: 'Name of the extension',
    },
    extensionDescription: {
      message: translation.extensionDescription,
      description: 'Description of the extension',
    },
    actionTitle: {
      message: translation.actionTitle,
      description: 'Tooltip text when hovering over the extension icon',
    },
  }

  const filePath = path.join(dirPath, 'messages.json')
  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8')
  console.log(`Created: ${filePath}`)
}

// Hàm cập nhật LanguageSelect.svelte
function updateLanguageSelect() {
  const languageOptions = Object.keys(languages)
    .map((langCode) => {
      return `    { value: '${langCode}', label: '${languages[langCode].name}' }`
    })
    .join(',\n')

  const template = `<script>
  // @ts-nocheck
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import ReusableSelect from './ReusableSelect.svelte'

  const languages = [
${languageOptions}
  ]

  function handleChange(newValue) {
    if (newValue) {
      updateSettings({ uiLang: newValue })
    }
  }
</script>

<ReusableSelect
  items={languages}
  bindValue={settings.uiLang}
  defaultLabel="English"
  ariaLabel="Select a language for the user interface"
  className="lang"
  onValueChangeCallback={handleChange}
/>`

  const filePath = path.join(
    __dirname,
    '../src/components/inputs/UILanguageSelect.svelte'
  )
  fs.writeFileSync(filePath, template, 'utf8')
  console.log(`Updated: ${filePath}`)
}

// Hàm cập nhật i18n.js
function updateI18n() {
  const imports = Object.keys(languages)
    .map((langCode) => {
      return `register('${langCode}', () => import('../locales/${langCode}.json'))`
    })
    .join('\n')

  const template = `// @ts-nocheck
import { register } from 'svelte-i18n'

// Register locales so they can be imported dynamically
${imports}`

  const filePath = path.join(__dirname, '../src/lib/i18n/i18n.js')
  fs.writeFileSync(filePath, template, 'utf8')
  console.log(`Updated: ${filePath}`)
}

// Hàm chính
function main() {
  console.log('Generating i18n files...')

  // Tạo file messages.json cho từng ngôn ngữ
  Object.keys(languages).forEach((langCode) => {
    if (translations[langCode]) {
      createMessagesFile(langCode, translations[langCode])
    } else {
      // Sử dụng tiếng Anh cho các ngôn ngữ chưa có bản dịch
      console.log(`Warning: No translation for ${langCode}, using English`)
      createMessagesFile(langCode, translations['en'])
    }
  })

  // Cập nhật các file liên quan
  updateLanguageSelect()
  updateI18n()

  console.log('Done!')
}

// Chạy script
if (require.main === module) {
  main()
}

module.exports = { main }
```

## Hướng dẫn sử dụng

### 1. Cài đặt dependencies

```bash
npm install --save-dev @google-cloud/translate
```

### 2. Tạo file dịch tự động (tùy chọn)

Nếu muốn sử dụng Google Translate API để tạo bản dịch tự động:

```javascript
// Thêm vào script trên
const { Translate } = require('@google-cloud/translate').v2

// Khởi tạo translator
const translate = new Translate({
  projectId: 'your-project-id',
  keyFilename: 'path/to/service-account-key.json',
})

// Hàm dịch văn bản
async function translateText(text, targetLang) {
  try {
    const [translation] = await translate.translate(text, targetLang)
    return translation
  } catch (error) {
    console.error(`Error translating to ${targetLang}:`, error)
    return text // Trả về văn bản gốc nếu lỗi
  }
}

// Hàm tạo bản dịch cho tất cả ngôn ngữ
async function generateTranslations() {
  const baseTranslations = translations['en']
  const allTranslations = { en: baseTranslations }

  for (const langCode of Object.keys(languages)) {
    if (langCode === 'en') continue

    const translated = {}
    for (const [key, value] of Object.entries(baseTranslations)) {
      translated[key] = await translateText(value, langCode)
    }

    allTranslations[langCode] = translated
  }

  return allTranslations
}
```

### 3. Thêm vào package.json

```json
{
  "scripts": {
    "generate-i18n": "node scripts/generate-i18n.js",
    "translate-i18n": "node scripts/translate-i18n.js"
  }
}
```

### 4. Chạy script

```bash
# Tạo file từ bản dịch có sẵn
npm run generate-i18n

# Dịch tự động (yêu cầu Google Translate API)
npm run translate-i18n
```

## Lưu ý quan trọng

1. **Chất lượng bản dịch**: Bản dịch tự động có thể không hoàn hảo, nên có người bản địa xem xét lại
2. **Kích thước file**: 54 ngôn ngữ có thể tăng kích thước extension khoảng 1-2MB
3. **Thứ tự ưu tiên**: Có thể tạo theo từng giai đoạn để kiểm tra chất lượng
4. **Backup**: Luôn backup trước khi chạy script

## Giai đoạn triển khai đề xuất

### Giai đoạn 1: 20 ngôn ngữ phổ biến nhất

1. en, vi, es, zh_CN, de, fr, ja, ko (đã có)
2. it, pt, pt_BR, ru, nl, pl, tr, hi, th, id, ar, ms

### Giai đoạn 2: 20 ngôn ngữ tiếp theo

1. sv, da, no, fi, el, cs, hu, ro, bg, zh_TW
2. tl, bn, ta, te, mr, gu, kn, ml, pa, ur

### Giai đoạn 3: 14 ngôn ngữ còn lại

1. he, fa, az, hy, sw, af, zu
2. ca, eu, gl, is, ga, cy, gd, sq

## Tối ưu hóa

1. **Lazy loading**: Chỉ tải ngôn ngữ khi cần
2. **Compression**: Nén file JSON
3. **CDN**: Lưu trữ file ngôn ngữ trên CDN
4. **Caching**: Cache file ngôn ngữ đã tải
