---
tags: [workflow]
links: [validate-dont-review]
source: Kun Chen, "Agent Engineering Workflow" (long running tasks)
---

# Long-running loops need caps

Claim: Autonomous overnight loops are safe when given precise caps and a verifiable objective; otherwise they can burn the weekly quota.

Evidence: "give it an objective and it will keep going until it meets some stop condition... I can set a token cap or iteration cap or stop condition more precisely."

Elaboration:
- gnhf ("good night, have fun") runs until a stop condition, token cap, or iteration cap.
- Well-suited to verifiable objectives: reduce page load, improve e2e coverage, auto-research hypotheses.
- DSH's goal/ralph primitives are the equivalent primitive; the precise caps are the lesson.
