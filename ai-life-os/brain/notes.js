/* Built by brain/build.py from brain/allowlist.txt. Do not edit by hand. */
var BRAIN_NOTES = [
 {
  "id": "first-mate",
  "title": "First mate",
  "tags": [
   "workflow"
  ],
  "links": [
   "worktree-pooling",
   "validate-dont-review"
  ],
  "source": "Kun Chen, \"Agent Engineering Workflow\" (first mate)",
  "claim": "The endgame is a first mate — one agent you talk to that dispatches, supervises, and validates a crew across worktrees, so you focus on direction.",
  "evidence": "\"I needed a first mate, someone I can talk to as a captain that will carry out all my directions and manage all the crewmates.\""
 },
 {
  "id": "worktree-pooling",
  "title": "Worktree pooling",
  "tags": [
   "workflow"
  ],
  "links": [
   "first-mate"
  ],
  "source": "Kun Chen, \"Agent Engineering Workflow\" (parallel worktrees)",
  "claim": "Manual git worktrees become unmanaged debt; a pool that reuses idle worktrees frees you from tracking them.",
  "evidence": "\"So this work tree basically becomes a debt... Treehouse... will try to reuse one of the idle work trees instead of creating a brand new one.\""
 },
 {
  "id": "validate-dont-review",
  "title": "Validate, don't review",
  "tags": [
   "workflow"
  ],
  "links": [
   "long-running-loops",
   "worktree-pooling"
  ],
  "source": "Kun Chen, \"Agent Engineering Workflow\" (validating code changes)",
  "claim": "Do not review diffs by hand (you become the bottleneck); run changes through an automated pipeline and apply judgment only at the PR, sized by risk.",
  "evidence": "\"in order to really scale ourselves with AI, we have to think of ourselves more as an engineering manager... I sense the change into a pipeline I built called No Mistakes.\""
 },
 {
  "id": "kun-chen-agent-policy",
  "title": "Kun Chen's agent policy (a distilled self)",
  "tags": [
   "people"
  ],
  "links": [],
  "source": "kunchenguid/dotfiles, home/AGENTS.md (this repo)",
  "claim": "Kun's shared AGENTS.md is a concrete distilled operating policy — six rules that let any agent act with his judgment.",
  "evidence": "\"Verify before claiming... Prefer the smallest change... Do not silently revert a deliberate decision... Ask before anything destructive... Never commit secrets... Report what changed, what was verified, and what is still open.\""
 },
 {
  "id": "pocock-steers-with-skills-kun-builds-machinery",
  "title": "Pocock steers with skills and prompts; Kun builds deterministic machinery",
  "tags": [
   "agentic-stack",
   "skills",
   "workflow"
  ],
  "links": [
   "popular-skills-are-not-good-skills",
   "kun-chen-agent-policy",
   "validate-dont-review",
   "progressive-disclosure"
  ],
  "source": "Matt Pocock, skills repo README (https://github.com/mattpocock/skills (README.md), retrieved 2026-10-17); Kun Chen, firstmate VISION.md (https://github.com/kunchenguid/firstmate/blob/main/VISION.md, retrieved 2026-10-17); Kun Chen, firstmate docs/subagent-guard.md (https://github.com/kunchenguid/firstmate/blob/main/docs/subagent-guard.md, retrieved 2026-10-17); Kun Chen, no-mistakes README (https://github.com/kunchenguid/no-mistakes (README.md), retrieved 2026-10-17); Kun Chen, kun repo OPINIONS.md (a map of his views inferred from public posts and talks, not his own first-person text) (https://github.com/kunchenguid/kun/blob/main/OPINIONS.md, retrieved 2026-10-17)",
  "claim": "Pocock's repo steers the agent with small skills and grilling prompts, while Kun Chen's repos put the exact steps in scripts and gates the agent cannot skip.",
  "evidence": "- \"My agent skills that I use every day to do real engineering - not vibe coding.\" [Matt Pocock]\n- \"These skills are designed to be small, easy to adapt, and composable.\" [Matt Pocock]\n- \"Approaches like GSD, BMAD, and Spec-Kit try to help by owning the process. But while doing so, they take away your control and make bugs in the process hard to resolve.\" [Matt Pocock]\n- \"getting the agent to ask you detailed questions about what you're building\" [Matt Pocock]\n- \"Logic that can be exact lives in deterministic scripts; work that requires understanding lives in an agent; the two never mix.\" [Kun Chen]\n- \"A denied name is removed from the model's schema entirely.\" [Kun Chen]\n- \"This is removal, not interception, and it is strictly stronger than any hook.\" [Kun Chen]\n- \"The initial change reaches the configured push target only after every local gate is green.\" [Kun Chen]\n- \"He prefers deterministic harnesses for repeated long-running loops instead of asking one context window to remember everything.\" [Kun Chen]"
 },
 {
  "id": "popular-skills-are-not-good-skills",
  "title": "Popular skills are not good skills",
  "tags": [
   "skills"
  ],
  "links": [
   "agent-ergonomics"
  ],
  "source": "Kun Chen, \"Agent Engineering Workflow\" (how skills may hurt)",
  "claim": "Skill popularity is not quality; some widely-shared skills make agents slower and worse, so only install skills with rigorous published evaluations.",
  "evidence": "\"the agent will use 5% more tokens while making the results worse... being popular is not the same as actually being good.\""
 },
 {
  "id": "progressive-disclosure",
  "title": "Progressive disclosure",
  "tags": [
   "skills"
  ],
  "links": [
   "icm-layer-ladder",
   "global-memory-is-minimal"
  ],
  "source": "Kun Chen, \"Agent Engineering Workflow\" (using skills)",
  "claim": "Skills load only a tiny description into the system prompt; the full body is read only when the agent decides it needs the skill.",
  "evidence": "\"when your agent starts, it only loads this tiny description field from your skills into the system prompt... only when it actually decides that it needs to use a certain skill, it will then reads the rest of this file.\""
 },
 {
  "id": "dialogue-freezes-into-skills",
  "title": "Dialogue freezes into skills",
  "tags": [
   "skills"
  ],
  "links": [
   "icm-layer-ladder"
  ],
  "source": "Jake Van Clief, \"Second Brain\" talk (14:40)",
  "claim": "A skill and an ICM are both frozen conversations — real dialogue crystallized into a file that can be replayed.",
  "evidence": "\"A skill is technically a frozen conversation, a frozen workflow. An ICM is a frozen conversation.\""
 },
 {
  "id": "llmwiki-vs-rag",
  "title": "LLMwiki (plain files) before RAG",
  "tags": [
   "decision"
  ],
  "links": [
   "global-memory-is-minimal",
   "mini-brains-not-one-brain"
  ],
  "source": "Captain, Troupe session 2026-10-22 (\"Folders to RAG\" in the Knowledge Universe)",
  "claim": "Plain-file notes (an LLMwiki) stay the default memory until roughly a hundred\nsources; move to RAG only when search and scale demand it, never by default.",
  "evidence": "\"It says plain files work up to about a hundred sources, which gives your\nnon-technical friends a real number.\" The second brain (62 notes) is the working\ninstance; nothing here needs a database yet."
 },
 {
  "id": "second-brain-is-a-context-layer",
  "title": "A second brain is a context layer",
  "tags": [
   "context-layer"
  ],
  "links": [
   "icm-layer-ladder"
  ],
  "source": "Jake Van Clief, \"Second Brain\" talk (04:35)",
  "claim": "A second brain is not a notes pile; it is a context layer — organized information built to feed context to an AI.",
  "evidence": "\"The whole idea anytime you hear a second brain at its core is just a layer to feed context to your AI. My method is a way of organizing that context layer.\""
 },
 {
  "id": "mini-brains-not-one-brain",
  "title": "Mini brains, not one brain of everything",
  "tags": [
   "method"
  ],
  "links": [
   "second-brain-is-a-context-layer"
  ],
  "source": "Jake Van Clief, \"Second Brain\" talk (27:02, 11:10)",
  "claim": "Build many small, per-workflow brains, each bespoke to one high-value operation, instead of one brain of everything.",
  "evidence": "\"I actually make multiple second brains based on workflows, not based on everything I'm doing.\""
 },
 {
  "id": "icm-routing-table-is-the-core-pattern",
  "title": "ICM: the routing table is the core pattern",
  "tags": [
   "icm",
   "context",
   "agentic-stack"
  ],
  "links": [
   "icm-storage-is-not-active-context"
  ],
  "source": "Clief Notes Foundation 0.2, 3.3 (mistake 2), 4.4, 4.5",
  "claim": "The most important thing in the entry file is a short explicit table — for this task, go to this workspace, read these files, maybe use these skills — and a rule that the agent reports which files it actually used, because a file's existence or name never guarantees it was read.",
  "evidence": "\"This is the most important pattern in the whole system… a simple table that tells the AI: for this task, read these files, skip those files, you might need these skills.\" Mistake 2 in 3.3: \"The routing is implicit.\" 4.4: \"A file called CONTEXT.md needs an instruction to read it; the filename alone is not a promise of automatic loading.\" Every Module 4 prompt ends with \"tell me which source you used.\""
 },
 {
  "id": "icm-layer-ladder",
  "title": "ICM layer ladder",
  "tags": [
   "agentic-stack",
   "context"
  ],
  "links": [],
  "source": "RinDig/Interpretable-Context-Methodology (arXiv:2603.16021)",
  "claim": "Agent context is best delivered in five numbered layers, each read only when needed — prevention, not compression.",
  "evidence": "\"Agents read down five layers and stop when they have what they need.\" (ICM README)"
 },
 {
  "id": "icm-storage-is-not-active-context",
  "title": "ICM: storage is not active context, and context is not authority",
  "tags": [
   "icm",
   "context",
   "memory",
   "security"
  ],
  "links": [
   "icm-routing-table-is-the-core-pattern"
  ],
  "source": "Clief Notes Foundation 2.3 \"How a 1953 Word Game Explains AI Memory\"",
  "claim": "A file on disk, a saved chat or a project folder is storage; only what is read or supplied for this request is context. Inside the context, instructions and source material sit side by side but do not carry equal authority — which is exactly why prompt injection exists and why a document must be treated as evidence, not permission.",
  "evidence": "\"Saved history and current context are different: material on disk or in a previous chat is not necessarily included in this request.\" \"Their presence in context does not give them the same authority or turn every sentence into executable code.\" Memory hierarchy analogy: weights (fixed in inference), context window (RAM), system instructions, retrieved context (disk→RAM on demand), persistent memory (across sessions)."
 },
 {
  "id": "structure-decides-what-matters",
  "title": "Structure decides what matters",
  "tags": [
   "method"
  ],
  "links": [
   "second-brain-is-a-context-layer"
  ],
  "source": "Jake Van Clief, \"Second Brain\" talk (31:09)",
  "claim": "Do not let the model decide what is important; encode importance in the folder structure, which the model then follows.",
  "evidence": "\"The structure forces what is important... letting the AI decide what is important is what you shouldn't be doing.\""
 },
 {
  "id": "right-size-the-model",
  "title": "Right-size the model",
  "tags": [
   "method"
  ],
  "links": [],
  "source": "Kun Chen, \"Full Stack App\" video (intro)",
  "claim": "You don't need the best model for everything; efficient models do most work, and the strongest is reserved for the hard parts.",
  "evidence": "\"a lot of the time we try to use the best model possible for everything... you actually can get a lot out of these more efficient models.\""
 },
 {
  "id": "reproduce-bugs-end-to-end",
  "title": "Reproduce bugs end-to-end",
  "tags": [
   "method"
  ],
  "links": [],
  "source": "Kun Chen, \"Agent Engineering Workflow\" (global memory rule)",
  "claim": "Start bug fixes by reproducing the bug end-to-end as the user experiences it, not with unit tests.",
  "evidence": "\"always starts with reproducing the bug in an end to end setting... AI models today by default like to write unit tests, which are often not sufficient and not really covering the product behaviors we want to guard.\""
 },
 {
  "id": "long-running-loops",
  "title": "Long-running loops need caps",
  "tags": [
   "workflow"
  ],
  "links": [
   "validate-dont-review"
  ],
  "source": "Kun Chen, \"Agent Engineering Workflow\" (long running tasks)",
  "claim": "Autonomous overnight loops are safe when given precise caps and a verifiable objective; otherwise they can burn the weekly quota.",
  "evidence": "\"give it an objective and it will keep going until it meets some stop condition... I can set a token cap or iteration cap or stop condition more precisely.\""
 },
 {
  "id": "human-in-the-loop",
  "title": "Build with a human in the loop",
  "tags": [
   "method"
  ],
  "links": [
   "structure-decides-what-matters"
  ],
  "source": "Jake Van Clief, \"Second Brain\" talk (27:13)",
  "claim": "Design systems assuming a human is in the loop; the human's abstraction is the efficient part, so amplify it rather than replace it.",
  "evidence": "\"You want to build your systems with the understanding that a human is in the loop... The human is very good at abstracting.\""
 },
 {
  "id": "global-memory-is-minimal",
  "title": "Global memory is minimal",
  "tags": [
   "memory"
  ],
  "links": [],
  "source": "Kun Chen, \"Agent Engineering Workflow\" (global memory file)",
  "claim": "The always-loaded global memory file must stay tiny because it is loaded into every session's system prompt and silently burns tokens.",
  "evidence": "\"There is only 27 lines. Because everything in this file gets loaded into the system prompt of every single agent session across all our projects.\""
 },
 {
  "id": "compaction-is-an-implementation-detail",
  "title": "Compaction is an implementation detail",
  "tags": [
   "workflow"
  ],
  "links": [
   "first-mate"
  ],
  "source": "Kun Chen, \"Full Stack App\" video (compaction)",
  "claim": "Context compaction is now an implementation detail; rely on server-side compaction and let the agent keep going across long sessions.",
  "evidence": "\"compaction... is really becoming an implementation detail that most people should not worry about anymore. Just let the agent run, let the agent compact when needed and it will just keep going.\""
 },
 {
  "id": "agent-ergonomics",
  "title": "Agent ergonomics (AXI)",
  "tags": [
   "agentic-stack"
  ],
  "links": [
   "popular-skills-are-not-good-skills"
  ],
  "source": "Kun Chen, \"Agent Engineering Workflow\" (the importance of agent ergonomics)",
  "claim": "The ergonomics of the tools you hand an agent dominate its cost and quality; AXI's ten principles (TOON output, minimal schemas, truncation, aggregates) beat MCP on tokens and latency.",
  "evidence": "\"GitHub MCP server will cost you to spend three times more on token cost, and more than double the latency compared to using the CLI... axi... lowest cost but highest success rate.\""
 },
 {
  "id": "adhd-mode",
  "title": "ADHD mode",
  "tags": [
   "talk-modes"
  ],
  "links": [
   "caveman-mode",
   "ste100-mode",
   "progressive-disclosure"
  ],
  "source": "EA-bot talk modes, written for this site",
  "claim": "ADHD mode puts the key point first, in bold, then gives one idea per line, short lists and one clear next step.",
  "evidence": "The rules are a reading layout for people who scan: the answer is in the first line, nothing important hides in a long paragraph, and the reply ends with what to do now.",
  "site": true
 },
 {
  "id": "caveman-mode",
  "title": "Caveman mode",
  "tags": [
   "talk-modes"
  ],
  "links": [
   "adhd-mode",
   "ste100-mode",
   "progressive-disclosure"
  ],
  "source": "EA-bot talk modes, written for this site",
  "claim": "Caveman mode answers in as few words as possible, with no filler, no greetings and no repeats of the question.",
  "evidence": "The rule is to keep only the words that carry meaning. Fewer words also means fewer tokens to read and pay for.",
  "site": true
 },
 {
  "id": "ste100-mode",
  "title": "STE100 mode",
  "tags": [
   "talk-modes"
  ],
  "links": [
   "adhd-mode",
   "caveman-mode",
   "progressive-disclosure"
  ],
  "source": "EA-bot talk modes, after ASD-STE100 Simplified Technical English",
  "claim": "STE100 mode writes in Simplified Technical English: short sentences, active voice, and one meaning for each word.",
  "evidence": "ASD-STE100 is a controlled language first written for aircraft maintenance texts. It limits sentence length, asks for one instruction per sentence, and uses a dictionary where each approved word has one meaning.",
  "site": true
 }
];
