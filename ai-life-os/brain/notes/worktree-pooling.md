---
tags: [workflow]
links: [first-mate]
source: Kun Chen, "Agent Engineering Workflow" (parallel worktrees)
---

# Worktree pooling

Claim: Manual git worktrees become unmanaged debt; a pool that reuses idle worktrees frees you from tracking them.

Evidence: "So this work tree basically becomes a debt... Treehouse... will try to reuse one of the idle work trees instead of creating a brand new one."

Elaboration:
- A raw worktree forces you to remember what it was for and whether an agent still runs in it.
- treehouse drops you into a fresh worktree and returns it to the pool when the tab closes.
- Isolation plus reuse means parallel agents never collide and never leave debris.
