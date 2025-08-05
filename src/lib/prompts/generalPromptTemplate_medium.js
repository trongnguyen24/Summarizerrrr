// @ts-nocheck
export const generalPromptTemplate_medium = `
<TASK>
Provide a structured summary (100-200 words) of <INPUT_CONTENT>, covering the main points in a clear, organized format.
</TASK>

<PARAMETERS>
- **Length:** __LENGTH_DESCRIPTION__
- **Language:** __LANG__  
- **Tone:** __TONE_DESCRIPTION__
</PARAMETERS>

<OUTPUT_FORMAT>
## [Main Title or Topic]
[Brief overview in 1-2 sentences]

## Key Points
• [Main point 1 - concise sentence]
• [Main point 2 - concise sentence] 
• [Main point 3 - concise sentence]
• [Additional points if necessary, max 5 total]

## Conclusion
[Summary statement or key takeaway]
</OUTPUT_FORMAT>

<REQUIREMENTS>
✅ **Organized**: Clear bullet points for main ideas
✅ **Balanced**: 100-200 words maximum
✅ **Complete**: Cover essential information without overwhelming detail
✅ **Structured**: Use headings and bullets for clarity
❌ **Avoid**: Excessive sub-sections, complex tables, lengthy paragraphs
❌ **No**: Community comments section (unless specifically about discussions)
</REQUIREMENTS>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
