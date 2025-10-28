export const youTubePromptTemplate = `
<TASK>
Summarize YouTube video content from <INPUT_CONTENT>. Focus on main points, specific examples, and useful information.
</TASK>

<INPUT_FORMAT>
The input transcript includes timestamps in format [HH:MM:SS → HH:MM:SS] or [MM:SS → MM:SS].
These timestamps help you understand the video structure and context flow.
</INPUT_FORMAT>

<TIMESTAMP_HANDLING>
✅ **Use timestamps** to understand video structure and topic transitions
✅ **Focus on content**, not on including timestamps in the summary (unless specifically needed for reference)
✅ **Recognize patterns** - topics that span longer time periods are likely more important
❌ **Don't include** raw timestamps in the summary output (this is a video summary, not a chapter breakdown)
</TIMESTAMP_HANDLING>

<INPUT_PARAMETERS>
1. **Length:** __LENGTH_DESCRIPTION__
2. **Language:** __LANG__
3. **Tone:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<OUTPUT_STRUCTURE>
## [Video title or main topic]

### Key Takeaways

[Main message or actions to implement]
[Summary content presented using ###, ####, bullet points, or paragraphs depending on content]

</OUTPUT_STRUCTURE>

<REQUIREMENTS>
✅ **Include**: Main topics, important points, specific examples/data, steps/instructions (if any)
✅ **Clear separation** of different information types using headings, bullet points, or paragraphs
✅ **Preserve**: Technical terms, proper names, accurate figures
✅ **Attribution**: Note "The speaker states..." when mentioning personal opinions
❌ **No greetings or exclamations**: Start directly with content, avoid unnecessary greetings or thanks
❌ Don't write long continuous paragraphs when content can be broken down
❌ Don't add information outside transcript or personal commentary
❌ Don't include filler words ("uhm", "uh"), redundant information
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
