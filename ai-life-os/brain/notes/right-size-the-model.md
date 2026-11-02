---
tags: [method]
links: []
source: Kun Chen, "Full Stack App" video (intro)
---

# Right-size the model

Claim: You don't need the best model for everything; efficient models do most work, and the strongest is reserved for the hard parts.

Evidence: "a lot of the time we try to use the best model possible for everything... you actually can get a lot out of these more efficient models."

Elaboration:
- Kun deliberately runs Luna (and Sonnet for design) instead of Opus, to prove the point.
- Across the whole build, the only Luna miss was one wrong-cost assumption he corrected.
- The frugal rule matches the dev-cost bias: capability is cheap; don't overpay by default.
