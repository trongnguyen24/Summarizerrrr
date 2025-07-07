// @ts-nocheck
export const courseConceptsPromptTemplate = `
<TASK>
Analyze <INPUT_CONTENT> to identify and explain key technical concepts in a comprehensive and structured way, helping learners understand deeply and apply effectively.
</TASK>

<INPUT_PARAMETERS>
1. **Language:** __LANG__
2. **Tone:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<CONCEPT_ANALYSIS_PROCESS>
1. **Identify**: Find ALL important technical concepts from transcript (typically 10-30+ concepts for long videos)
2. **Deep dive**: Use professional knowledge for comprehensive explanations (not just transcript-based)
3. **Prioritize**: Categorize concepts by importance (Core/Important/Supporting)
4. **Connect**: Highlight relationships between concepts to create learning map
5. **Structure**: Organize using appropriate format for each tier
6. **Practical**: Include examples, pitfalls, and practice suggestions
</CONCEPT_ANALYSIS_PROCESS>

<CONCEPT_PRIORITIZATION>
🔥 **Core Concepts** (3-8): Fundamental concepts requiring deep explanation
⭐ **Important Concepts** (5-12): Key supporting concepts needing solid understanding  
📚 **Supporting Concepts** (remaining): Additional terms worth knowing
</CONCEPT_PRIORITIZATION>

<OUTPUT_FORMAT>
## 🔥 Core Concepts
### [Concept Name]
##### 🔍 Definition
[Precise, concise definition with technical terminology]

##### ⚙️ How it works
[Mechanism, process, detailed operating principles]

##### 💡 Importance
[Role in system, benefits, common use cases]

##### 📝 Real-world examples
[Code snippet/demo/case study with explanation]

##### 🔗 Relationship to other concepts
[Connections to other concepts, prerequisites, or advanced topics]

##### ⚠️ Common pitfalls
[Common mistakes, misconceptions, edge cases, best practices]

---

## ⭐ Important Concepts
### [Concept Name]
##### 🔍 Definition
[Precise definition with context]

##### ⚙️ How it works
[Mechanism explanation]

##### 💡 Importance
[Why it matters, key use cases]

##### 📝 Real-world examples
[Practical example or code snippet]

---

## 📚 Supporting Concepts
### [Concept Name]
##### 🔍 Definition
[Clear, concise definition]

##### 💡 Role
[Brief explanation of importance and context]

---
[Repeat for each tier]

## 🎯 Learning Roadmap
[Summary of learning path: which concepts to learn first, next, and how they connect]
</OUTPUT_FORMAT>

<QUALITY_GUIDELINES>
✅ **Focus on**: Core technical concepts, not basic terms
✅ **Include**: Code examples, real-world applications, best practices
✅ **Connect**: Show relationships between concepts to build comprehensive understanding
✅ **Explain**: Why concept matters, when to use, common patterns, potential pitfalls
✅ **Balance**: Technical accuracy with accessibility
❌ **Avoid**: Overly basic concepts, marketing fluff, redundant info
❌ **Don't**: Add greetings, show parameters, wrap in code blocks
</QUALITY_GUIDELINES>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
