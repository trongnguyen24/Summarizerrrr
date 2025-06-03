<div align="center">
  <img width="320px" src="public/Sumarizzerrrr.png" alt="Summarizerrrr"/>
  <p><a href="https://chromewebstore.google.com/detail/summarizerrrr/ahfjndakflcegianjdojpldllodpkkpc">Install on Chrome Web Store</a></p>
</div>

# Summarizerrrr Chrome Extension 🚀

A Chrome extension that deep summarizes content from YouTube, websites, Facebook posts, Reddit, and any text-based page online. Built to save time and meet personal needs unmet by existing tools. 😊

## 🎁 Free to Use

- Powered by Google's Gemini API key (free tier with usage limits: tokens, requests/min).

## ✨ Key Features

### 📺 YouTube Summarization

- Summarizes key points or by video chapters (timeline).

### 📝 Web Content Summarization

- Summarizes text-heavy sites (e.g., Reddit, news).
- Includes comment summaries from diverse perspectives.

## ⚙️ Customization

### Gemini Model

- ⚡ **2.0 Flash**: Fast, slightly quirky results.
- 🧠 **2.5 Flash**: High-quality, slower due to model thinking.
- 💎 **2.5 Pro**: Premium quality, best for paid API users.

### Summary Style

- 📌 **Adherent**: Precise (temperature=0.3, topP=0.82).
- ⚖️ **Balanced**: Moderate (temperature=0.6, topP=0.91).
- 🎨 **Creative**: Expressive (temperature=0.9, topP=0.96).

### Summary Size

- 🔍 **Short**: Brief overview.
- 📄 **Medium**: Core content.
- 📚 **Long**: Detailed summary.

### Summary Format

- 📝 **Plain**: Simple paragraphs.
- 📑 **Heading**: Organized with headings.

### Language Options

- 🗣️ English, Vietnamese, Korean (50+ languages coming soon).

### Additional Features

- Dark/Light mode interface.
- Auto-scaling font for side panel.
- Table of Contents for a "summary of the summary" in bottom-right corner.

## 🛠️ Installation and Usage

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Build Extension**:
   ```bash
   npm run build
   ```
   - Creates files in the `dist` directory.
3. **Install in Chrome**:
   - Navigate to `chrome://extensions`.
   - Enable **Developer mode** (top right).
   - Click **Load unpacked** and select the `dist` folder.
4. **Set Up API Key**:
   - Locate the Summarizerrrr icon in Chrome's toolbar.
   - Open settings/options via the icon.
   - Enter your Gemini API Key (exact location depends on the extension's interface).

## 🚀 Upcoming Features

- Landing page with documentation, tips, and use cases.
- YouTube summary timestamps linked to video player.
- Streaming responses (non-blocking).
- Support for 50+ languages.
- Enhanced translation prompts.
- PDF summarization.
- Response styles (e.g., Expert, Casual, Alien, Quirky Friend).
- Save, copy, or export summaries as PDF/Markdown.
- Text-to-speech for summaries.

Stay tuned for updates!

---

## 📜 License

Licensed under the **MIT License**.
