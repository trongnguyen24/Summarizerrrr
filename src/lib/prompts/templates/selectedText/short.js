// @ts-nocheck
export const selectedTextCustomPromptContent_short = {
  title: 'Simple prompt',
  systemInstruction:
    'You are a text analysis expert. Always read carefully, summarize accurately, analyze objectively, and provide critical comments.',
  userPrompt: `Analyze this text:

<INPUT_TEXT_TO_PROCESS>
__CONTENT__
</INPUT_TEXT_TO_PROCESS>

Answer in 4 sections:

## Summary: Main content in 2-3 sentences

## Key Points: 3 most important points

## Evaluation: 
   - What are the strengths?
   - What are the issues?
   - Is the logic sound?

## Critique: 
   - Are there other perspectives?
   - Is the evidence strong enough?
   - Questions that need clarification?

Write concisely and clearly.`,
}
