---
tags: [skills]
links: [agent-ergonomics]
source: Kun Chen, "Agent Engineering Workflow" (how skills may hurt)
---

# Popular skills are not good skills

Claim: Skill popularity is not quality; some widely-shared skills make agents slower and worse, so only install skills with rigorous published evaluations.

Evidence: "the agent will use 5% more tokens while making the results worse... being popular is not the same as actually being good."

Elaboration:
- A repo with 177k stars, evaluated on a benchmark, used 5% more tokens and worse results.
- Skills can also instruct agents to run arbitrary code and exfiltrate credentials — a security risk, not just a quality risk.
- Rule: never install a skill that claims magic but publishes no rigorous proof.
