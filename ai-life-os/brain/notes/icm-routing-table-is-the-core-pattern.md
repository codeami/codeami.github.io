---
tags: [icm, context, agentic-stack]
links: [icm-storage-is-not-active-context]
source: Clief Notes Foundation 0.2, 3.3 (mistake 2), 4.4, 4.5
---

# ICM: the routing table is the core pattern

Claim: The most important thing in the entry file is a short explicit table — for this task, go to this workspace, read these files, maybe use these skills — and a rule that the agent reports which files it actually used, because a file's existence or name never guarantees it was read.

Evidence: "This is the most important pattern in the whole system… a simple table that tells the AI: for this task, read these files, skip those files, you might need these skills." Mistake 2 in 3.3: "The routing is implicit." 4.4: "A file called CONTEXT.md needs an instruction to read it; the filename alone is not a promise of automatic loading." Every Module 4 prompt ends with "tell me which source you used."

Elaboration:
- Routing rows are `| Task | Go to | Read | Skills |`; a new client or project is one new row.
- The root points to the job-specific note; that note points to the material and the output location.
- Folders do not enforce anything — permissions and review do; the table only makes the intended selection inspectable.

