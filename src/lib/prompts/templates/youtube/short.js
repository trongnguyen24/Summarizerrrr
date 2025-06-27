// @ts-nocheck
export const youtubeCustomPromptContent_short = {
  title: 'Skeleton prompt',
  systemInstruction: '',
  userPrompt: `Analyze the YouTube video transcript below and create a structured summary that captures the main topics, key insights, and practical information.

REQUIREMENTS:
✅ **Include**: Main topics, examples, case studies, numbers/statistics, tools mentioned
✅ **Structure**: Clear ## headings for sections, ### for subsections, - for bullet points
✅ **Emphasis**: **Bold** important terms and concepts on first mention
✅ **Practical**: Focus on actionable insights and educational value
❌ **Remove**: Filler words ("um", "uh"), repetitions, unnecessary transitions
❌ **Avoid**: Adding external information not in transcript

FORMAT:
## Video Summary: [Main Topic]
### [Section Name]
- Key points with specific details preserved
- Examples and demonstrations mentioned
- Technical terms, tools, recommendations

## Key Takeaways
- 3-5 most important actionable insights

TRANSCRIPT:
__CONTENT__`,
}
