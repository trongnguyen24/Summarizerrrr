export const generalPromptTemplate = `
<TASK>
Summarize <INPUT_CONTENT> in a structured format, including both main content and comments (if present).
</TASK>

<PARAMETERS>
- **Length:** __LENGTH_DESCRIPTION__ *(__LENGTH_NOTE__)*
- **Language:** __LANG__  
- **Tone:** __TONE_DESCRIPTION__
</PARAMETERS>

<OUTPUT_FORMAT>
## [Main Title]
[Structured summary using ##, ###, #### and bullets, tables, emoji for clear presentation]

### [Topic-based Subsections]
- **Key points** with important terms bolded
- Tables for data/comparisons (when appropriate)
- Emoji for highlighting

## Community Response *(if comments exist)*
- Can group by themes, sentiment, or types
- Use emoji and flexible structure
- Focus on valuable insights, don't force into fixed categories
</OUTPUT_FORMAT>

<CORE_REQUIREMENTS>
✅ **Comprehensive**: Include ALL important information, no omissions
✅ **Structured**: Use diverse formats (headings, bullets, tables, emoji)
✅ **Objective**: Maintain original meaning, present balanced viewpoints
✅ **Quality focus**: Prioritize valuable, reliable information
✅ **Clear separation**: Distinguish main content from community reactions
❌ **Do not add** personal opinions or external information
❌ **Do not omit** important insights from comments (especially Reddit threads)
</CORE_REQUIREMENTS>

<SPECIAL_NOTES>
- **Reddit/Forum content**: Prioritize all high-upvote comments, personal experiences, debates
- **Technical content**: Retain key metrics, data, actionable insights
- **Conflicting views**: Present multiple perspectives objectively
- **Poor quality content**: Extract best available info, acknowledge limitations
</SPECIAL_NOTES>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
