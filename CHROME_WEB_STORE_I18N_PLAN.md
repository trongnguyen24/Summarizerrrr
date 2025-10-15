# Kế hoạch triển khai Chrome Web Store i18n cho Summarizerrrr

## Mục tiêu

Thêm hỗ trợ đa ngôn ngữ cho Chrome Web Store để hiển thị thông tin extension (tên, mô tả) theo ngôn ngữ của người dùng trên trang cửa hàng.

## Yêu cầu Chrome Web Store i18n

- Chrome Web Store sử dụng hệ thống i18n riêng biệt với cấu trúc thư mục `_locales`
- Cần có `default_locale` trong manifest.json
- File messages.json cho từng ngôn ngữ chứa bản dịch cho các chuỗi trong manifest

## Các bước thực hiện

### 1. Cập nhật wxt.config.ts

Thêm `default_locale: 'en'` vào phần manifest cho Chrome:

```typescript
// Trong wxt.config.ts
manifest: ({ browser }) => {
  if (browser === 'chrome') {
    return {
      // ... existing config
      default_locale: 'en',
      // ... rest of config
    }
  }
  // ... firefox config (không thay đổi)
}
```

### 2. Tạo cấu trúc thư mục \_locales

Tạo cấu trúc thư mục sau trong `public/`:

```
public/
├── _locales/
│   ├── en/
│   │   └── messages.json
│   ├── vi/
│   │   └── messages.json
│   ├── es/
│   │   └── messages.json
│   ├── zh_CN/
│   │   └── messages.json
│   ├── de/
│   │   └── messages.json
│   ├── fr/
│   │   └── messages.json
│   ├── ja/
│   │   └── messages.json
│   └── ko/
│       └── messages.json
```

### 3. Nội dung file messages.json

#### public/\_locales/en/messages.json

```json
{
  "extensionName": {
    "message": "Summarizerrrr",
    "description": "Name of the extension"
  },
  "extensionDescription": {
    "message": "Extension helps you summarize for YouTube, Udemy, Coursera, any websites. Crafted with superior UI/UX design.",
    "description": "Description of the extension"
  },
  "actionTitle": {
    "message": "Click to Open Summarizerrrr",
    "description": "Tooltip text when hovering over the extension icon"
  }
}
```

#### public/\_locales/vi/messages.json

```json
{
  "extensionName": {
    "message": "Summarizerrrr",
    "description": "Tên của extension"
  },
  "extensionDescription": {
    "message": "Tiện ích giúp bạn tóm tắt cho YouTube, Udemy, Coursera và bất kỳ trang web nào. Được chế tác với thiết kế UI/UX vượt trội.",
    "description": "Mô tả của extension"
  },
  "actionTitle": {
    "message": "Nhấp để mở Summarizerrrr",
    "description": "Văn bản hiển thị khi di chuột qua biểu tượng tiện ích"
  }
}
```

#### public/\_locales/es/messages.json

```json
{
  "extensionName": {
    "message": "Summarizerrrr",
    "description": "Nombre de la extensión"
  },
  "extensionDescription": {
    "message": "Extensión que te ayuda a resumir para YouTube, Udemy, Coursera, cualquier sitio web. Diseñada con un diseño de UI/UX superior.",
    "description": "Descripción de la extensión"
  },
  "actionTitle": {
    "message": "Haz clic para abrir Summarizerrrr",
    "description": "Texto del tooltip al pasar el cursor sobre el ícono de la extensión"
  }
}
```

#### public/\_locales/zh_CN/messages.json

```json
{
  "extensionName": {
    "message": "Summarizerrrr",
    "description": "扩展名称"
  },
  "extensionDescription": {
    "message": "帮助您总结YouTube、Udemy、Coursera和任何网站内容的扩展。采用卓越的UI/UX设计精心制作。",
    "description": "扩展描述"
  },
  "actionTitle": {
    "message": "点击打开Summarizerrrr",
    "description": "悬停在扩展图标上时显示的工具提示文本"
  }
}
```

#### public/\_locales/de/messages.json

```json
{
  "extensionName": {
    "message": "Summarizerrrr",
    "description": "Name der Erweiterung"
  },
  "extensionDescription": {
    "message": "Erweiterung hilft Ihnen bei der Zusammenfassung für YouTube, Udemy, Coursera, beliebige Websites. Hergestellt mit überlegenen UI/UX-Design.",
    "description": "Beschreibung der Erweiterung"
  },
  "actionTitle": {
    "message": "Klicken Sie, um Summarizerrrr zu öffnen",
    "description": "Tooltip-Text beim Überfahren des Erweiterungssymbols"
  }
}
```

#### public/\_locales/fr/messages.json

```json
{
  "extensionName": {
    "message": "Summarizerrrr",
    "description": "Nom de l'extension"
  },
  "extensionDescription": {
    "message": "Extension vous aide à résumer pour YouTube, Udemy, Coursera, tous les sites web. Conçue avec un design UI/UX supérieur.",
    "description": "Description de l'extension"
  },
  "actionTitle": {
    "message": "Cliquez pour ouvrir Summarizerrrr",
    "description": "Texte d'info-bulle au survol de l'icône de l'extension"
  }
}
```

#### public/\_locales/ja/messages.json

```json
{
  "extensionName": {
    "message": "Summarizerrrr",
    "description": "拡張機能の名前"
  },
  "extensionDescription": {
    "message": "YouTube、Udemy、Coursera、任意のウェブサイトの要約を支援する拡張機能。優れたUI/UXデザインで作られています。",
    "description": "拡張機能の説明"
  },
  "actionTitle": {
    "message": "クリックしてSummarizerrrrを開く",
    "description": "拡張機能アイコンをホバーしたときに表示されるツールチップテキスト"
  }
}
```

#### public/\_locales/ko/messages.json

```json
{
  "extensionName": {
    "message": "Summarizerrrr",
    "description": "확장 프로그램 이름"
  },
  "extensionDescription": {
    "message": "YouTube, Udemy, Coursera, 모든 웹사이트를 요약하는 데 도움을 주는 확장 프로그램. 뛰어난 UI/UX 디자인으로 제작되었습니다.",
    "description": "확장 프로그램 설명"
  },
  "actionTitle": {
    "message": "클릭하여 Summarizerrrr 열기",
    "description": "확장 프로그램 아이콘을 마우스로 가리킬 때 표시되는 도구 설명 텍스트"
  }
}
```

### 4. Cập nhật manifest để sử dụng i18n

Trong wxt.config.ts, cập nhật các chuỗi trong manifest để sử dụng i18n:

```typescript
// Trong phần manifest cho Chrome
manifest: ({ browser }) => {
  if (browser === 'chrome') {
    return {
      // ... existing config
      name: '__MSG_extensionName__',
      description: '__MSG_extensionDescription__',
      action: {
        default_title: '__MSG_actionTitle__',
        default_popup: 'popop.html',
      },
      default_locale: 'en',
      // ... rest of config
    }
  }
  // ... firefox config
}
```

## Lưu ý quan trọng

1. Chrome Web Store i18n chỉ ảnh hưởng đến cách extension được hiển thị trên cửa hàng, không ảnh hưởng đến giao diện bên trong extension
2. Hệ thống svelte-i18n hiện tại của bạn sẽ tiếp tục hoạt động như bình thường
3. Tên thư mục ngôn ngữ phải theo mã ngôn ngữ của Chrome (ví dụ: zh_CN thay vì zh-CN)
4. Sau khi triển khai, cần tải lại extension và kiểm tra trên Chrome Web Store

## Kiểm tra

1. Build extension: `npm run build`
2. Kiểm tra file .output/chrome-mv3/manifest.json có chứa `default_locale: "en"`
3. Kiểm tra thư mục \_locales được sao chép vào .output/chrome-mv3/
4. Tải extension lên Chrome để kiểm tra
