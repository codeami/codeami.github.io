---
tags: [method]
links: []
source: Kun Chen, "Agent Engineering Workflow" (global memory rule)
---

# Reproduce bugs end-to-end

Claim: Start bug fixes by reproducing the bug end-to-end as the user experiences it, not with unit tests.

Evidence: "always starts with reproducing the bug in an end to end setting... AI models today by default like to write unit tests, which are often not sufficient and not really covering the product behaviors we want to guard."

Elaboration:
- Unit tests guard internals; an e2e repro guards the product behavior the user actually hit.
- Leaning into e2e testing is more reliable for agent changes.
- This is the same "record evidence" instinct no-mistakes formalizes (screenshot / video / log).
