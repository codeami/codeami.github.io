---
tags: [agentic-stack, skills, workflow]
links: [popular-skills-are-not-good-skills, kun-chen-agent-policy, validate-dont-review, progressive-disclosure]
source: Matt Pocock, skills repo README (https://github.com/mattpocock/skills (README.md), retrieved 2026-10-17); Kun Chen, firstmate VISION.md (https://github.com/kunchenguid/firstmate/blob/main/VISION.md, retrieved 2026-10-17); Kun Chen, firstmate docs/subagent-guard.md (https://github.com/kunchenguid/firstmate/blob/main/docs/subagent-guard.md, retrieved 2026-10-17); Kun Chen, no-mistakes README (https://github.com/kunchenguid/no-mistakes (README.md), retrieved 2026-10-17); Kun Chen, kun repo OPINIONS.md (a map of his views inferred from public posts and talks, not his own first-person text) (https://github.com/kunchenguid/kun/blob/main/OPINIONS.md, retrieved 2026-10-17)
status: reviewed
origin: scout
checked: 2026-10-17
---

# Pocock steers with skills and prompts; Kun builds deterministic machinery

Claim: Pocock's repo steers the agent with small skills and grilling prompts, while Kun Chen's repos put the exact steps in scripts and gates the agent cannot skip.

Evidence:
- "My agent skills that I use every day to do real engineering - not vibe coding." [Matt Pocock]
- "These skills are designed to be small, easy to adapt, and composable." [Matt Pocock]
- "Approaches like GSD, BMAD, and Spec-Kit try to help by owning the process. But while doing so, they take away your control and make bugs in the process hard to resolve." [Matt Pocock]
- "getting the agent to ask you detailed questions about what you're building" [Matt Pocock]
- "Logic that can be exact lives in deterministic scripts; work that requires understanding lives in an agent; the two never mix." [Kun Chen]
- "A denied name is removed from the model's schema entirely." [Kun Chen]
- "This is removal, not interception, and it is strictly stronger than any hook." [Kun Chen]
- "The initial change reaches the configured push target only after every local gate is green." [Kun Chen]
- "He prefers deterministic harnesses for repeated long-running loops instead of asking one context window to remember everything." [Kun Chen]

Elaboration:
- Short version: Pocock is deterministic by procedure (the agent is asked to follow it). Kun is deterministic by infrastructure (the agent cannot do otherwise).
- The word 'deterministic' is not on Pocock's page. That label is our reading, and the captain's framing, not a claim Pocock makes.
- Why it matters here: a rule in AGENTS.md is procedure. A script such as check_links.py is infrastructure. Put a rule in a script when it must never be skipped.
- Related: [[popular-skills-are-not-good-skills]], [[kun-chen-agent-policy]], [[validate-dont-review]].
