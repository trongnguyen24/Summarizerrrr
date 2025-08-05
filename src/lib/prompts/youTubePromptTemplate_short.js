// @ts-nocheck
export const youTubePromptTemplate_short = `
<TASK>
Provide a concise summary (50-100 words) of this YouTube video content, focusing only on the most essential information.
</TASK>

<PARAMETERS>
- **Length:** __LENGTH_DESCRIPTION__
- **Language:** __LANG__
- **Tone:** __TONE_DESCRIPTION__
</PARAMETERS>

<OUTPUT_FORMAT>
## Main Topic
[1-2 sentences describing what the video is about]

## Key Takeaway
[Single most important point or actionable insight]
</OUTPUT_FORMAT>

<REQUIREMENTS>
✅ **Essential only**: Focus on the core message
✅ **Concise**: 50-100 words maximum
✅ **Clear**: Simple, direct language
❌ **Avoid**: Detailed examples, step-by-step instructions, minor points
❌ **No**: Multiple sections, extensive formatting
</REQUIREMENTS>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
