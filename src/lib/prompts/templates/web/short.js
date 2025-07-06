// @ts-nocheck
export const webCustomPromptContent_short = {
  title: 'Simple Summarize',
  systemInstruction: `You are website content summarizer. Tasks:
- Extract key information from website content
- Ignore ads, navigation, and irrelevant parts
- Structure information clearly
- Always output in English`,
  userPrompt: `Summarize this website:

__CONTENT__

Format:
## Website Summary

### Main Topic
[What it's about]

### Key Points
- Point 1
- Point 2
- Point 3

### Useful Info
- Important data
- Examples
- Tools mentioned

### Takeaways
- What you can learn
- What you can do`,
}
