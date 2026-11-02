---
tags: [workflow]
links: [long-running-loops, worktree-pooling]
source: Kun Chen, "Agent Engineering Workflow" (validating code changes)
---

# Validate, don't review

Claim: Do not review diffs by hand (you become the bottleneck); run changes through an automated pipeline and apply judgment only at the PR, sized by risk.

Evidence: "in order to really scale ourselves with AI, we have to think of ourselves more as an engineering manager... I sense the change into a pipeline I built called No Mistakes."

Elaboration:
- Pipeline: branch -> commit -> isolated worktree -> understand intent -> rebase -> adversarial review -> e2e test with recorded evidence -> docs -> lint -> push -> PR -> babysit CI.
- The adversarial review catches most problems; ambiguous product decisions are escalated to the human.
- A risk assessment decides review depth: low-risk changes get almost no manual review.
