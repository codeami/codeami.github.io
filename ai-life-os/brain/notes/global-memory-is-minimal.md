---
tags: [memory]
links: []
source: Kun Chen, "Agent Engineering Workflow" (global memory file)
---

# Global memory is minimal

Claim: The always-loaded global memory file must stay tiny because it is loaded into every session's system prompt and silently burns tokens.

Evidence: "There is only 27 lines. Because everything in this file gets loaded into the system prompt of every single agent session across all our projects."

Elaboration:
- Kun's global file holds only personal preferences (never use em-dash; correct the dev-cost bias; reproduce bugs end-to-end).
- If it is too large, it silently uses tokens on every request whether or not the content is needed.
- Conditional content belongs in skills (progressive disclosure), not the global file.
