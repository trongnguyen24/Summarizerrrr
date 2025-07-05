export const youTubePromptTemplate = `
<TASK>
Summarize YouTube video content from <INPUT_CONTENT>. Focus on main points, specific examples, and useful information.
</TASK>

<INPUT_PARAMETERS>
1. **Length:** __LENGTH_DESCRIPTION__ *(__LENGTH_NOTE__)*
2. **Language:** __LANG__
3. **Tone:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<OUTPUT_STRUCTURE>
## [Video title or main topic]
[Summary content presented using ###, ####, bullet points, or paragraphs depending on content]

## Key Takeaways
[Main message or actions to implement]
</OUTPUT_STRUCTURE>

<REQUIREMENTS>
✅ **Include**: Main topics, important points, specific examples/data, steps/instructions (if any)
✅ **Clear separation** of different information types using headings, bullet points, or paragraphs
✅ **Preserve**: Technical terms, proper names, accurate figures
✅ **Attribution**: Note "The speaker states..." when mentioning personal opinions
❌ Don't write long continuous paragraphs when content can be broken down
❌ Don't add information outside transcript or personal commentary
❌ Don't include filler words ("uhm", "uh"), redundant information
❌ Don't add unnecessary greetings or introductions
</REQUIREMENTS>

<SPECIAL_CASES>
- **Short/noisy transcript**: Summarize what's available or note "Insufficient transcript information for detailed summary."
- **Tutorial videos**: Prioritize clear implementation steps
- **Data-heavy videos**: Include accurate statistics and research findings
</SPECIAL_CASES>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
