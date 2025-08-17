# YouTube Mobile Transcript Extractor with Timestamps

This Chrome extension automatically extracts and logs transcripts with timestamps from YouTube Mobile videos to the browser console.

## Files Overview

- **manifest.json**: Extension configuration file
- **content-script.js**: Main content script that handles transcript extraction
- **youtube_captions_extractor.js**: Core function for extracting YouTube captions
- **youtube_video_metadata.js**: Protobuf schema for YouTube video metadata
- **lib/protobuf.min.js**: Protobuf library for encoding/decoding

## Installation Instructions

### 1. Load Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the `Test` folder containing this extension

### 2. Verify Installation

- The extension should appear in your extensions list
- You should see "YouTube Mobile Transcript Extractor" with version 1.0

## How to Use

### 1. Navigate to YouTube

- Go to any YouTube video on:
  - `m.youtube.com` (Mobile YouTube)
  - `www.youtube.com` (Desktop YouTube)

### 2. Open Developer Console

1. Press `F12` or right-click and select "Inspect"
2. Go to the "Console" tab
3. Clear the console for better visibility

### 3. Watch the Magic Happen

- The extension will automatically detect when you're on a YouTube video page
- It will attempt to extract transcripts in multiple languages (English, Vietnamese, auto-generated)
- Transcript data will be logged to the console

## Console Output Format

When a transcript is successfully extracted, you'll see detailed output with timestamps:

```
=== YOUTUBE TRANSCRIPT WITH TIMESTAMPS EXTRACTED ===
Video ID: [VIDEO_ID]
Language: [LANGUAGE_CODE]
Total Segments: [NUMBER]
Full Transcript ([NUMBER] characters):
[COMPLETE TRANSCRIPT TEXT]
--- TIMESTAMPED SEGMENTS ---
[0:00 → 0:03] Hello and welcome to this video
[0:03 → 0:07] Today we're going to learn about...
[0:07 → 0:12] This is an important topic because...
--- STRUCTURED DATA ---
JSON Format: [
  {
    "text": "Hello and welcome to this video",
    "startTimeMs": 0,
    "endTimeMs": 3000,
    "startTime": "0:00",
    "endTime": "0:03"
  },
  ...
]
--- END TRANSCRIPT ---
```

## Troubleshooting

### No Transcript Output

1. **Check Console**: Make sure you have the browser console open
2. **Video Has Captions**: Not all videos have transcripts available
3. **Wait for Loading**: The extension waits for the video to load before extracting
4. **Refresh Page**: Try refreshing the YouTube page

### Extension Not Working

1. **Check Extension Status**: Go to `chrome://extensions/` and ensure the extension is enabled
2. **Reload Extension**: Click the reload button in the extensions page
3. **Check Permissions**: Ensure the extension has permission to access YouTube sites

### Common Issues

- **"getCaptions function not available"**: Dependencies are still loading, wait a moment
- **"No video ID found"**: You're not on a video page, navigate to a specific video
- **"No transcript found"**: The video doesn't have available captions/transcripts

## Technical Details

### Supported Languages

The extension tries to extract transcripts in this order:

1. `en` - English
2. `vi` - Vietnamese
3. `zz` - Auto-generated (any language)

### Permissions

The extension requires:

- `activeTab`: To interact with the current YouTube tab
- `scripting`: To inject content scripts
- Host permissions for `*.youtube.com` and `*.m.youtube.com`

### How It Works

1. Content script monitors for YouTube video page navigation
2. When a video is detected, it waits for all dependencies to load
3. Extracts video ID from the URL
4. Uses the YouTube internal API to fetch transcript data with timing information
5. Formats timestamps from milliseconds to readable HH:MM:SS or MM:SS format
6. Logs both the complete transcript and individual timestamped segments to the browser console

### Timestamp Features

- **Multiple Formats**: Shows both milliseconds (for programmatic use) and readable time format
- **Segment-by-Segment**: Each transcript segment includes start and end times
- **JSON Export**: Complete structured data available for further processing
- **Time Ranges**: Shows duration of each spoken segment (e.g., [0:00 → 0:03])

## Development Notes

- The extension works with YouTube's single-page application navigation
- Uses MutationObserver to detect URL changes
- Handles both mobile and desktop YouTube interfaces
- Includes error handling for various edge cases
