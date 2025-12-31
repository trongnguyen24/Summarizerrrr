// @ts-nocheck
export const youtubeSummary = {
  title: 'YouTube Summarizer',
  // System role is now handled dynamically in builders/index.js based on toneDefinitions
  // Keeping a default/fallback here if needed, but the builder will prioritize toneDefinitions
  userPrompt: `<TASK>
Summarize YouTube video content from <INPUT_CONTENT>. Focus on main points, specific examples, and useful information. __TONE_DESCRIPTION__. Reply in __LANG__
</TASK>

<REQUIREMENTS>
✅ **Timestamps Location**: **CRITICAL RULE**: Timestamps MUST ONLY appear at the very end of the H3 headers (###).
✅ **Visuals**: Use relevant emojis (e.g., 💡, 🚀, ⚠️, 📉) to make the summary visually appealing.
✅ **Content**: Main topics, important points, specific examples/data, steps/instructions.
✅ **Clear separation**: Use headings, bullet points, or paragraphs.
❌ **No Output Tags**: Don't include the <title> or <OUTPUT_STRUCTURE> tags.
❌ **No Redundancy**: Do not repeat the timestamp in the content body.
❌ **No Plain Blocks**: Avoid long blocks of text without visual breaks (emojis/bullets).
</REQUIREMENTS>

<EXAMPLE>
## Growth Mindset vs Fixed Mindset

## 🔑 Key Takeaways
- Key point 1 - concise sentence include emojis for key concepts
- Key point 2 - concise sentence include emojis for key concepts
- Key point 3 - concise sentence include emojis for key concepts
- Key point n...

## 📝 Details of the video
### Introduction to Growth Mindset [00:00]
[Structured summary using #### and bullets, tables, include emojis for key concepts]

### Research in Education [03:45]
#### Key Studies 📚
[Structured summary using #### and bullets, tables, include emojis for key concepts]

#### Example of Michael Jordan 🏀
Cut from high school basketball team but didn't give up, practiced hard and became an NBA legend.

### Application in the Workplace [08:20]
[Structured summary using #### and bullets, tables, include emojis for key concepts]
</EXAMPLE>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>

Reply in __LANG__
`,
}

export const youtubeSummaryMedium = `
<TASK>
Provide a structured summary (100-300 words) of this YouTube video content, covering the main points clearly. __TONE_DESCRIPTION__. Reply in __LANG__.
</TASK>

<OUTPUT_FORMAT>
## [Video Topic/Title]
[Brief overview of what the video covers]

## Main Points
- Key point 1 - concise sentence include emojis for key concepts [emoji] [00:12]
- Key point 2 - concise sentence include emojis for key concepts [emoji] [03:23]
- Key point 3 - concise sentence include emojis for key concepts [emoji] [06:34]
- Additional points if necessary, max 8 total

## Key Takeaways
[Most important conclusions or actionable insights]
</OUTPUT_FORMAT>

<REQUIREMENTS>
✅ **Focused**: Main topics and important points only
✅ **Timestamps**: Include timestamps for each point
✅ **Visuals**: Use relevant emojis (e.g., 💡, 🚀, ⚠️, 📉) to make the summary visually appealing.
✅ **Actionable**: Include practical takeaways when present
❌ **Avoid**: Detailed step-by-step instructions, minor examples
❌ **No**: Excessive sub-sections, lengthy explanations
</REQUIREMENTS>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>

Reply in __LANG__
`

export const youtubeSummaryShort = `
<TASK>
Provide a concise summary (50-100 words) of this YouTube video content, focusing only on the most essential information. __TONE_DESCRIPTION__. Reply in __LANG__.
</TASK>


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

Reply in __LANG__
`

export const youtubeChapter = {
  title: 'Chapter Summarizer',
  // System role is now handled dynamically in builders/index.js based on toneDefinitions
  userPrompt: `<TASK>
Analyze <INPUT_CONTENT> and create detailed chapter-by-chapter summaries with estimated start times. Pay special attention to preserving examples, stories, and important illustrative details. __TONE_DESCRIPTION__. __LENGTH_DESCRIPTION__. Reply in __LANG__
</TASK>

<KEY_REQUIREMENTS>
✅ **Clearly separate** using paragraphs, headings and bullet points
✅ **Preserve proper names and numbers** for accuracy
✅ **Link examples to main arguments** - explain what each example illustrates
✅ **Timestamps**: Include timestamps for each point
❌ Don't write long continuous paragraphs
❌ Don't mix different types of information together
❌ Don't skip important illustrative examples
❌ Don't add greetings or personal commentary
</KEY_REQUIREMENTS>

<EXAMPLE>
## Growth Mindset

### [0:00] Introduction to Growth Mindset
#### Carol Dweck's concept of **Growth Mindset** vs **Fixed Mindset**
People with growth mindset believe abilities can be improved through effort.

#### Example of Michael Jordan:
Cut from high school basketball team but didn't give up, practiced hard and became an NBA legend.

### [3:45] Research in Education
**Experiment with 400 students**:
- How praise affects children's mindset
- Praising "process" is more effective than praising "results"
- Results: second group improved test scores by 23% after 6 months.

**Lisa's story**: Weak math student who changed her thinking from "I'm not good at math" to "I'm not good at math yet", eventually achieved an A grade.

### [8:20] Application in the Workplace
Companies like **Microsoft** apply Growth Mindset in corporate culture, encouraging employees to learn from failure rather than avoid risks.

## Overall Conclusion
Growth mindset not only improves learning but also helps people overcome challenges in all areas of life.
</EXAMPLE>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>

Reply in __LANG__
`,
}
