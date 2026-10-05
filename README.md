# pi-optimize

A tiny [Pi](https://pi.dev) extension that rewrites the draft in your input box into a clearer, structured prompt — and an equivalent skill for [Antigravity CLI](https://antigravity.google) (`agy`).

## What it does

- Reads the current input-box draft.
- Asks the **active model** to rewrite it: same language, same intent, same concrete details, only more clarity and structure (goal / context / requirements / constraints / output).
- Puts the result **back into the input box**. Nothing is sent automatically.

```
draft:  帮我优化这段代码，它太慢了，看看哪里能改
        ── Alt+O ──▶
result: ## 🎯 目标
        优化指定代码的性能…
        ## 📋 要求
        1. …
        ## 📦 输出
        …
```

## Install on a new machine

### Pi (recommended, via git)

```bash
pi install git:github.com/<your-username>/pi-optimize
```

Then reload Pi with `/reload` (or restart it).

### Pi (manual, no package manager)

```bash
cp extensions/optimize-prompt.ts ~/.pi/agent/extensions/
```

### Antigravity CLI (`agy`)

```bash
mkdir -p ~/.gemini/config/skills/optimize
cp agy/skills/optimize/SKILL.md ~/.gemini/config/skills/optimize/
```

agy reloads slash commands and skills automatically (on conversation switches), so no restart is usually needed.

## Usage

| Trigger | Where | Effect |
|---|---|---|
| **`Alt+O`** | Pi | Rewrite the current input-box draft **in place** (main entry point). |
| `/optimize <draft>` | Pi / agy | Optimize the given text. |
| `/optimize` | Pi | Open a multi-line editor, paste a draft, optimize it. |
| `/optimize be concise` | Pi | Same, with extra guidance. |
| `/optimize <draft>` | agy | Skill expands and the model replies with the optimized prompt. |

> Why a shortcut in Pi? Pi clears the editor before an extension command runs, so a slash command cannot read the draft that was in the box. `Alt+O` fires without touching the editor, so it can rewrite the draft in place. The `/optimize` command still works for text passed as arguments or pasted into a dialog.

## Requirements

- Pi 1.0+ (uses `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui` — all provided by the host).
- Node.js 22.19+ (for Pi itself).
- For the agy skill: Antigravity CLI with customization support (`~/.gemini/config/`).

## Test

Self-contained headless suite (stubs the TUI and the model call):

```bash
bash test/run.sh
```

## Notes

- Works in interactive (TUI) mode only. Alt+O needs the editor; `/optimize` uses a terminal loader.
- `Alt+O` is not bound to another built-in Pi action at the time of writing; remap it in `extensions/optimize-prompt.ts` if it conflicts.
- The rewrite is one model call with `cacheRetention: "none"`; it does not enter the conversation context.

## License

MIT
