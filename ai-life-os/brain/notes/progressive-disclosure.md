---
tags: [skills]
links: [icm-layer-ladder, global-memory-is-minimal]
source: Kun Chen, "Agent Engineering Workflow" (using skills)
---

# Progressive disclosure

Claim: Skills load only a tiny description into the system prompt; the full body is read only when the agent decides it needs the skill.

Evidence: "when your agent starts, it only loads this tiny description field from your skills into the system prompt... only when it actually decides that it needs to use a certain skill, it will then reads the rest of this file."

Elaboration:
- Move conditional knowledge out of the always-loaded memory file into skills, so tokens are only spent when needed.
- This is the skills-level twin of the ICM layer ladder: both prevent loading everything.
- Skill Creator (anthropics) is installed via the skills CLI to teach agents to make skills.
