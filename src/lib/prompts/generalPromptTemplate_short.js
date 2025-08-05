// @ts-nocheck
export const generalPromptTemplate_short = `
<TASK>
Provide a concise summary (50-100 words) of <INPUT_CONTENT>, capturing only the most essential information.
</TASK>

<PARAMETERS>
- **Length:** __LENGTH_DESCRIPTION__
- **Language:** __LANG__  
- **Tone:** __TONE_DESCRIPTION__
</PARAMETERS>

<OUTPUT_FORMAT>
## Main Point
[1-2 sentences capturing the core message or most important information]

## Key Takeaway
[Single most important conclusion, action item, or insight]
</OUTPUT_FORMAT>

<REQUIREMENTS>
✅ **Focus**: Only the most critical information
✅ **Concise**: 50-100 words maximum
✅ **Clear**: Simple structure, no complex formatting
❌ **Avoid**: Minor details, examples, lengthy explanations
❌ **No**: Multiple sections, tables, extensive bullet points
</REQUIREMENTS>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
