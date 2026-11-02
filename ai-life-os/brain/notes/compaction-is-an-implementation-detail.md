---
tags: [workflow]
links: [first-mate]
source: Kun Chen, "Full Stack App" video (compaction)
---

# Compaction is an implementation detail

Claim: Context compaction is now an implementation detail; rely on server-side compaction and let the agent keep going across long sessions.

Evidence: "compaction... is really becoming an implementation detail that most people should not worry about anymore. Just let the agent run, let the agent compact when needed and it will just keep going."

Elaboration:
- OpenAI server-side compaction (via a Pi extension) outperforms the default; Kun runs it for GPT models.
- Four compactions in one session had no visible effect because dispatched work is persisted to files.
- The file-persisted state (the ICM instinct) is what makes compaction lossless.
