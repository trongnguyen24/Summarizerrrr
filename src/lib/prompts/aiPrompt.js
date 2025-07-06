const aiPrompt = `
This is a task description that I want you to create a high-quality prompt template for:

<task_description> {{userPrompt}} </task_description>

Based on the task description, please create a well-structured prompt template that another AI can use to complete the task consistently. The prompt template should include:

1.  **Start with <instruction>** describing the task the AI needs to perform with "<INPUT_TEXT_TO_PROCESS>" as the context that users input.
2.  <steps> [Specific step-by-step instructions for the AI to follow to complete the task, detailed step by step]
3.  <guidelines> [Include specific do (✅) and don't (❌) to ensure the response meets the required quality standards]
4.  <format> Output format using ## and ### tags
5.  <validation> [Quality criteria for checking output before returning]
6.  Add <INPUT_TEXT_TO_PROCESS>__CONTENT__</INPUT_TEXT_TO_PROCESS> placeholder at the end.

----------

**Target Language**: __LANG__

**Output Instructions**: Return ONLY the enhanced prompt about 400 words, ready for immediate use. No explanations, greetings, or additional text.`

export default aiPrompt
