---
tags: [icm, context, memory, security]
links: [icm-routing-table-is-the-core-pattern]
source: Clief Notes Foundation 2.3 "How a 1953 Word Game Explains AI Memory"
---

# ICM: storage is not active context, and context is not authority

Claim: A file on disk, a saved chat or a project folder is storage; only what is read or supplied for this request is context. Inside the context, instructions and source material sit side by side but do not carry equal authority — which is exactly why prompt injection exists and why a document must be treated as evidence, not permission.

Evidence: "Saved history and current context are different: material on disk or in a previous chat is not necessarily included in this request." "Their presence in context does not give them the same authority or turn every sentence into executable code." Memory hierarchy analogy: weights (fixed in inference), context window (RAM), system instructions, retrieved context (disk→RAM on demand), persistent memory (across sessions).

Elaboration:
- Traditional computing separates code from data by hardware and OS; a model has no such boundary, so application controls and review do that job.
- "A CLAUDE.md is project guidance; it is not the model's system prompt and cannot override higher-priority instructions."
- Prompting is programming at the highest abstraction layer; reliability comes from architecture around the unreliable part (the Grace Hopper argument).

Why it matters here: it is the reason the overnight pass (backpass) writes proposals and a human applies them — inbox content is untrusted until reviewed — and the reason `context-icm`'s `load_context` returns a named, bounded set rather than "everything".
