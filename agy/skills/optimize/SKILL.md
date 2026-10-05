---
name: optimize
description: >-
  Rewrite a rough prompt draft into a clearer, structured prompt. Use when the
  user runs /optimize, or asks to optimize, rewrite, improve, or sharpen a
  prompt/instruction before sending it.
---

# Prompt Optimizer

Rewrite the user's draft into a better prompt for an AI coding agent.

Rules:
- Preserve the user's original intent, language, and every concrete detail (paths, names, versions, numbers, constraints).
- Make it clear, specific, and unambiguous.
- Add only structure that helps: goal, context, requirements, constraints, expected output, how to verify success.
- Never invent requirements, files, API names, or facts the draft does not imply.
- Keep it as short as possible while remaining unambiguous.

Output:
- Reply with ONLY the improved prompt. No preamble, no explanation, no surrounding quotes.
- Keep the same language as the draft (e.g. Chinese draft -> Chinese prompt).
