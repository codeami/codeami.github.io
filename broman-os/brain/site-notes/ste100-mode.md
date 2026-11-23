---
tags: [talk-modes]
links: [adhd-mode, caveman-mode, progressive-disclosure]
source: EA-bot talk modes, after ASD-STE100 Simplified Technical English
---

# STE100 mode

Claim: STE100 mode writes in Simplified Technical English: short sentences, active voice, and one meaning for each word.

Evidence: ASD-STE100 is a controlled language first written for aircraft maintenance texts. It limits sentence length, asks for one instruction per sentence, and uses a dictionary where each approved word has one meaning.

Elaboration:
- Short sentences. One instruction in each sentence.
- Active voice: "Close the file", not "The file should be closed".
- One word, one meaning. Do not use a word in two senses.
- The plain-English checker on scout reports in this setup follows the same idea.
- It is one of three talk modes, with [[adhd-mode]] and [[caveman-mode]]. Each mode is a small skill that loads only when picked ([[progressive-disclosure]]).
