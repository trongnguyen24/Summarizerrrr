# Summarizerrrr: Fast and Efficient Content Summarization

## Introduction

In a world overflowing with information, quickly grasping knowledge is incredibly important. **Summarizerrrr** is here to help you do just that. This is a powerful open-source tool in the form of a Chrome Extension, allowing you to summarize content from various sources, helping you grasp the main points without needing to read or watch everything.

Built with modern technology, Summarizerrrr provides a smooth and efficient experience right in your browser.

## Key Features

- **Smart Summarization:** Utilizes the power of Gemini AI's language models to generate accurate and easy-to-understand summaries.
- **Multiple Source Support:** Summarize content from popular sources (currently likely YouTube transcripts, with potential for future expansion).
- **Browser Integration:** Works seamlessly within your chromium browser.
- **User-Friendly Interface:** Intuitive user interface, easy to use even for beginners.
- **Open Source:** Completely free and open source.
- **Customization:** Allows customizing the length or detail of the summary.

## Technologies Used

- **Svelte:** Modern UI framework, providing high performance and a great development experience.
- **Vite:** Fast build tool, optimizing the development process.
- **Tailwind CSS 4:** Utility-first CSS framework for rapid and flexible UI development.
- **Gemini API:** Uses Google's language models for powerful summarization capabilities.

## Installation and Usage

To install and use the Summarizerrrr Chrome Extension, follow these steps:

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Build extension:
    ```bash
    npm run build
    ```
    This will create the necessary files in the `dist` directory.
3.  Install Extension in Chrome:
    - Open Chrome and type `chrome://extensions` in the address bar.
    - Enable "Developer mode" in the top right corner.
    - Click "Load unpacked" and select the `dist` (or corresponding build) folder within your project directory.
4.  Set up API Key:
    - After installation, the extension will appear in your list of extensions.
    - Find the Summarizerrrr icon on your Chrome toolbar.
    - Click the icon and look for the settings or options section to enter your API Key (e.g., Gemini API Key). (Note: The exact location may vary depending on how you've implemented the extension's settings interface).

## License

This project is licensed under the **MIT License**.
