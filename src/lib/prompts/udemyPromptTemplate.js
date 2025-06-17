// @ts-nocheck
export const udemySummaryPromptTemplate = `

<USER_TASK>
Analyze the provided <Transcript> and generate a summary according to the stated <Parameters> and <Guidelines>.
</USER_TASK>

<Parameters>
1.  Summary Length: \${length}
    - "short": Very concise summary (max 2 sentences) of the overall main idea of the lecture.
    - "medium": Concise summary (2-4 sentences) covering the main points discussed.
    - "long": Detailed summary (5+ sentences or multiple paragraphs) covering all important sections, supporting points, and conclusions. Aim to comprehensively cover the key aspects mentioned in a condensed manner.
    *(Note: Sentence count is an estimate; the goal is to convey full information within the desired length and based on the transcript content.)*

2.  Language: \${lang}
    - The summary will be returned entirely in the specified language with the highest translation quality - accurate, natural, and fluent like a native speaker, precisely translating technical terms and proper nouns.

3.  Format: \${format}
    - "plain": Summary as one or more plain paragraphs.
    - "heading": Summary organized with an h2 (##) heading for the main topic and h3 (###) headings for important sections/points. Content under each heading must be consistent with the required length (\${length}) and highlight the "key points" of that section.
</Parameters>

<Guidelines>
- **Analysis:** Carefully read the transcript to identify the main topic, key points, supporting examples/illustrations, and conclusions of the lecture.
- **Organization:** Organize information logically and coherently.
- **Formatting (Conditional):** If the format is "heading", create clear headings for the main topic (##) and important sections/points (###).
- **Conciseness:** Eliminate unnecessary details, redundant information, superfluous words/phrases, and non-content transitional phrases (e.g., "uhm", "ah", "you know"). Retain only the core content.
- **Objectivity & Accuracy:** Maintain an objective and accurate tone, relying solely on content *from* the transcript. Do not infer or add external information.
- **Specific Content:** If the lecture contains technical terms, statistics, or studies, include this information accurately in the summary, consistent with the required length.
- **Perspective:** If the speaker shares personal opinions or views, clearly state that these are views *presented in the lecture* (e.g., "The speaker suggests...", "According to the perspective shared in the lecture...").
- **Steps/Instructions:** If there is a discussion of specific steps or instructions, summarize the main steps concisely and clearly (especially important for "medium" and "long" lengths).
- **Length & Detail:** Ensure the level of detail and amount of content in the overall summary is consistent with the required length (\${length}). If using "heading" format, content under each heading should also be proportionate.
- **Handling Insufficient Transcript Information:** If the <Transcript> is too short, contains no relevant content, or is too noisy to create a meaningful summary according to the required length, return the shortest possible summary (perhaps just 1-2 sentences) about what is in the transcript or state (in the requested language \${lang}) that "Insufficient information in the transcript to create a detailed summary."
- **Constraints:**
    - Do not add any greetings, introductions, personal conclusions, or any other text outside the required summary structure and format.
    - Do not display settings information (like requested length, language, format) in the output.
    - Do not use markdown blocks to enclose the output.
</Guidelines>

<Example Output format="heading" lang="en" length="medium">
## Summary of JavaScript Closures Lecture:

### Concept of Closure
A closure in JavaScript is an inner function that has access to the variables from its outer scope, even after the outer function has finished execution. This allows the inner function to "remember" the environment in which it was created.

### How it works
When a function is defined inside another function, the inner function creates a closure. This closure includes the inner function and the lexical environment of the outer function (i.e., the outer function's variables and arguments).

### Practical Applications
Closures are very useful for creating private functions, managing state in modules, and building factory functions. They are a powerful concept in JavaScript for creating flexible and secure data structures.
</Example Output>

<Transcript>
\${text}
</Transcript>
`

export const udemyConceptsPromptTemplate = `

<role>
    You are a highly knowledgeable expert with extensive knowledge. You are capable of analyzing information from documents and explaining complex concepts to learners in a clear, structured, and comprehensive manner.
</role>

<output_language>
    Explanation language: \${lang}
</output_language>

<action>
    1. Carefully read the course transcript provided below, focusing on identifying key technical concepts.
    2. For each identified concept, based on your in-depth knowledge (not solely on information in the transcript), please:
       a. Provide a clear definition.
       b. Explain in detail how it works or its underlying principles.
       c. Highlight its importance or significance in the relevant field.
       d. Provide at least one practical example or code snippet to illustrate.
    3. To ensure accuracy and depth, think step-by-step when analyzing and explaining each concept.
    4. Ensure explanations are in-depth, covering important aspects without going into unnecessary detail, and use an academic yet accessible tone.
    - **Constraints:**
    - Do not add any greetings or introductions.
    - Do not use markdown blocks to enclose the output.
</action>

<format>
    Please present your answer in \${lang} and follow this structure. Ensure the following headings are translated into \${lang}:
    ### [Concept 1]
    #### 1. Definition
    [Detailed, in-depth definition explanation]
    #### 2. How it works / Principle
    [Clear and comprehensive explanation of how it works or its principles]
    #### 3. Importance / Significance
    [Analysis of its importance or significance in the relevant field]
    #### 4. Example / Application
    [Provide a practical example or use case to illustrate]

    ### [Concept 2]
    #### 1. Definition
    [Detailed, in-depth definition explanation]
    #### 2. How it works / Principle
    [Clear and comprehensive explanation of how it works or its principles]
    #### 3. Importance / Significance
    [Analysis of its importance or significance in the relevant field]
    #### 4. Example / Application
    [Provide a practical example or use case to illustrate]
    Continue this structure for all identified key concepts.
</format>



<input_transcript>

    \${text}

</input_transcript>

`
