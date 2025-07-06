// @ts-nocheck
export const udemyConceptsCustomPromptContent_short = {
  title: 'Simple prompt',
  systemInstruction: `You are educational concept extractor. Tasks:
- Find all important terms and concepts in course content
- Define each concept in simple English
- Show how concepts connect to each other
- Organize from basic to advanced`,
  userPrompt: `Find all concepts in this course:

__CONTENT__

Format:
## Course Concepts

### [Concept Name]
- What it is: [definition]
- Why important: [reason]
- Example: [simple example]

### [Next Concept]
- What it is: [definition]
- Why important: [reason]  
- Example: [simple example]`,
}
