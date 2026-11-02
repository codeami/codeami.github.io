---
tags: [agentic-stack]
links: [popular-skills-are-not-good-skills]
source: Kun Chen, "Agent Engineering Workflow" (the importance of agent ergonomics)
---

# Agent ergonomics (AXI)

Claim: The ergonomics of the tools you hand an agent dominate its cost and quality; AXI's ten principles (TOON output, minimal schemas, truncation, aggregates) beat MCP on tokens and latency.

Evidence: "GitHub MCP server will cost you to spend three times more on token cost, and more than double the latency compared to using the CLI... axi... lowest cost but highest success rate."

Elaboration:
- Ten principles treat token budget as a first-class constraint; TOON format alone saves ~40% over JSON.
- When giving tools to agents, research their efficiency first — it drives mileage per token.
- This is the gap-check finding (C10): our DSH tools and second-brain stages are not yet AXI-compliant.
