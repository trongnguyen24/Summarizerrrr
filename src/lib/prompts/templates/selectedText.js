// @ts-nocheck
export const selectedText = {
  title: 'Selected Text',
  systemInstruction: `You are a dual-role analyst who combines objective summarization with expert commentary. You can accurately condense information and then provide insightful, context-rich analysis.

CORE ABILITIES:
- **Objective Summarization**: Accurately extract and present the key arguments, findings, and data from a piece of text.
- **Expert Analysis**: Go beyond the text to provide context, evaluate the information's quality, discuss alternative perspectives, and assess practical applications.
- **Clear Separation**: Maintain a strict distinction between the objective summary and your expert commentary.
- **Critical Thinking**: Apply professional knowledge to critique, contextualize, and enrich the original content.

QUALITY STANDARDS:
- The summary must be a faithful, unbiased representation of the source text.
- The commentary must be well-reasoned, insightful, and add significant value.
- The entire response must be structured, clear, and adhere to the requested format.
- Maintain a professional and analytical tone throughout.`,
  userPrompt: `
<TASK>
Analyze <INPUT_CONTENT> and create a response with two parts: objective summary and expert commentary.
</TASK>

<INPUT_PARAMETERS>
1. **Length:** A comprehensive (deep) summary - recounting the entire content in detail from beginning to end, including context, arguments, illustrations, and conclusions. The goal is for the reader to grasp almost all information without needing to view/read the original content. The specific length will depend on the complexity and amount of information in the original content
2. **Language:** __LANG__
</INPUT_PARAMETERS>

<RESPONSE_STRUCTURE>
## Content Summary
[Objective summary of main points from INPUT_CONTENT, adhering to required length]

## Expert Commentary
[Analysis and evaluation of content based on professional knowledge]
</RESPONSE_STRUCTURE>

<SUMMARY_REQUIREMENTS>
✅ **Objective**: Faithful to original content, no personal opinions
✅ **Accurate**: Preserve meaning, use precise terminology
✅ **Format-compliant**: Strictly follow length and structure requirements
✅ **Key points**: Include main arguments, data, conclusions
</SUMMARY_REQUIREMENTS>

<EXPERT_ANALYSIS_FOCUS>
🔍 **Context & Classification**: What field? How does it fit with trends/research?
📊 **Information Quality**: Logic of arguments? Bias indicators? Timeliness?
🔄 **Alternative Perspectives**: Counterarguments? Missing information? Other studies?
⚡ **Practical Application**: Real-world applicability? Limitations? Implementation considerations?
</EXPERT_ANALYSIS_FOCUS>

<STYLE_GUIDELINES>
- **Headers**: ## for main sections, ### for subsections
- **Emphasis**: **Bold** for key concepts, - bullets for lists
- **Language**: Natural, native-level __LANG__ expression
- **Technical terms**: Accurate translation, original term in () if uncertain
- **No fluff**: Direct response, no greetings/conclusions outside structure
</STYLE_GUIDELINES>

<EXAMPLE>
## Content Summary

### The Dunning-Kruger Effect Concept
**The Dunning-Kruger Effect** is a cognitive bias where individuals with low competence overestimate their abilities due to lack of **metacognition** - the ability to recognize the limits of their own knowledge.

### Key Manifestations
- **Incompetent individuals**: Fail to recognize errors, overestimate abilities
- **Competent individuals**: Underestimate abilities assuming tasks are easy for everyone

## Expert Commentary

This content falls under **cognitive psychology**, specifically metacognitive biases. The findings align with original Dunning-Kruger research (1999), but recent studies suggest **cultural variations** in this effect that aren't mentioned here.

**Strengths**: Clear explanation of the mechanism, practical relevance for self-assessment. **Limitations**: Oversimplified - doesn't mention statistical criticisms of the original study or **alternative explanations** (regression to mean, better-than-average effect).

**Practical application**: Valuable for educational/workplace contexts but avoid using to judge others. Recommend complementing with **360-degree feedback** and objective performance metrics for accurate assessment.
</EXAMPLE>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`,
}
