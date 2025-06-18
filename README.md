<div align="center">
  <img width="320px" src="public/Sumarizzerrrr.png" alt="Summarizerrrr"/>
  <p><a href="https://chromewebstore.google.com/detail/summarizerrrr/ahfjndakflcegianjdojpldllodpkkpc">Install on Chrome Web Store</a></p>
  <p><a href="https://addons.mozilla.org/en-CA/firefox/addon/summarizerrrr/">Install on Firefox Add-ons</a></p>
</div>

# Summarizerrrr Chrome Extension 🚀

A browser extension that deep summarizes content from YouTube, websites, Facebook posts, Reddit, and any text-based page online. Built to save time and meet personal needs unmet by existing tools. 😊

## 🎁 Free to Use

- Powered by various AI providers (e.g., Google Gemini, Ollama, Openrouter).
- You can use your own API key for these providers.

## ✨ Key Features

### 📺 YouTube Summarization

- Summarizes key points or by video chapters (timeline).

### 📝 Web Content Summarization

- Summarizes text-heavy sites (e.g., Reddit, news).
- Includes comment summaries from diverse perspectives.

### ✂️ Summarize Selected Text

- Highlight any text on a webpage and generate a concise summary instantly.

### 🎓 Udemy Content Summarization

- Summarizes key courses and concepts from Udemy lectures.

## ⚙️ Customization

### Gemini Model

- ⚡ **2.0 Flash**: Fast, slightly quirky results.
- ⚡ **2.5 Flash Lite**: High-quality, faster.
- 🧠 **2.5 Flash**: High-quality, slower due to model thinking.

### AI Providers

- **Google Gemini**: Use your Gemini API key.
- **Ollama**: Connect to local models via Ollama.
- **Openrouter**: Integrate with free various models via Openrouter.

### Summary Style

- 📝 **Simple**: Easy to understand, friendly.
- 🧠 **Expert**: Professional, technically deep.
- 👽 **Alien**: Curious, analytical, novel perspectives.

### Advanced Parameters

- **Temperature**: Controls the randomness of the output (0.0 - 1.0). Higher values mean more creative results.
- **Top P**: Controls the diversity of the output (0.0 - 1.0). Higher values mean more diverse results.

### Summary Size

- 🔍 **Short**: Brief overview.
- 📄 **Medium**: Core content.
- 📚 **Long**: Detailed summary.

### Summary Format

- 📝 **Plain**: Simple paragraphs.
- 📑 **Heading**: Organized with headings.

### Language Options

- 🗣️ More than 40+: English, Chinese (Simplified), Spanish, French, German, Japanese, Korean, Arabic, Portuguese, Russian, Hindi, Indonesian, Italian, Turkish, Vietnamese...

### Additional Features

- Dark/Light mode interface.
- Font options: Dyslexic, Mix, San-serif, Serif.
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
- PDF summarization.
- Response styles (e.g., Expert, Casual, Alien, Quirky Friend).
- Save, copy, or export summaries as PDF/Markdown.
- Text-to-speech for summaries.

Stay tuned for updates!

---

## 📜 License

Licensed under the **MIT License**.
