// @ts-nocheck

export const udemySummaryPromptTemplate = `
<TASK>
Summarize Udemy lecture from <INPUT_CONTENT>, focusing on core knowledge and practical steps.
</TASK>

<INPUT_PARAMETERS>
1. **Length:** __LENGTH_DESCRIPTION__ *(__LENGTH_NOTE__)*
2. **Language:** __LANG__
3. **Tone:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<REQUIREMENTS>
✅ **Include**: Main concepts, term definitions, practical steps, code examples/demos
✅ **Learning format**: Use ##, ###, #### and bullets, tables, emoji for clear presentation
✅ **Preserve**: Code snippets, technical terms, exact tool/framework names
✅ **Best practices**: Highlight tips, warnings, common mistakes mentioned
✅ **Actionable**: Prioritize immediately applicable information
❌ **Remove**: "Uhm", "okay", transition words, duplicate information
❌ **Don't add**: Knowledge outside the lecture, additional explanations
</REQUIREMENTS>

<LEARNING_FOCUS>
- **Concepts**: Clear definitions of new concepts
- **Steps**: List implementation steps in order
- **Examples**: Include specific examples, code samples if available
- **Pitfalls**: Note common errors or things to avoid
- **Resources**: Tools, frameworks, documentation recommended
</LEARNING_FOCUS>

<SPECIAL_CASES>
- **Code-heavy lectures**: Prioritize syntax, key functions, implementation steps
- **Theory lectures**: Focus on concepts, relationships, real-world applications  
- **Hands-on tutorials**: Emphasize workflow, debugging tips, best practices
- **Missing/poor transcript**: Summarize understandable parts or note "Insufficient transcript information"
</SPECIAL_CASES>


<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
