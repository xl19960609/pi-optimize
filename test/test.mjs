// Headless logic tests for the optimize-prompt extension.
// Run via `bash test/run.sh` (which stages stub @earendil-works packages first).
import extension from "./optimize-prompt.ts";

function setup(opts = {}) {
  const mode = opts.mode ?? "tui";
  const model = ("model" in opts) ? opts.model : { id: "test/model" };
  const response = opts.response;
  const completeThrows = opts.completeThrows;
  let editorText = opts.draft ?? "";
  const notifications = [];
  const editorCalls = [];
  const ctx = {
    mode, model,
    ui: {
      getEditorText: () => editorText,
      setEditorText: (t) => { editorText = t; },
      notify: (m, lvl) => notifications.push({ m, lvl }),
      custom: (factory) => new Promise((resolve) => { factory({}, {}, {}, (v) => resolve(v)); }),
      editor: async (title, prefill) => { editorCalls.push({ title, prefill }); return opts.dialogResult; },
    },
    modelRegistry: { complete: async () => { if (completeThrows) throw new Error("boom"); return response; } },
  };
  const commands = {}, shortcuts = {};
  extension({ registerCommand: (n, d) => { commands[n] = d; }, registerShortcut: (k, d) => { shortcuts[k] = d; } });
  return { command: commands.optimize.handler, shortcut: shortcuts["alt+o"].handler, ctx, getText: () => editorText, notifications, editorCalls };
}

const ok = (text) => ({ stopReason: "stop", content: [{ type: "text", text }] });
const cases = [];
const check = (n, c, e = "") => cases.push({ n, ok: !!c, e });
let t, seen;

// ---- shortcut (Alt+O) ----
t = setup({ draft: "   " }); await t.shortcut(t.ctx);
check("shortcut: empty draft warns", t.notifications.some(x => /empty/i.test(x.m)) && t.getText() === "   ");

t = setup({ draft: "hi", mode: "print" }); await t.shortcut(t.ctx);
check("shortcut: non-TUI stays silent", t.getText() === "hi" && t.notifications.length === 0);

t = setup({ draft: "hi", model: undefined }); await t.shortcut(t.ctx);
check("shortcut: no model warns", t.notifications.some(x => /No active model/i.test(x.m)));

t = setup({ draft: "make code fast", response: ok("## Goal\nMake it fast.") }); await t.shortcut(t.ctx);
check("shortcut: rewrites in place", t.getText().startsWith("## Goal"), JSON.stringify(t.getText()));

t = setup({ draft: "d", response: ok("```md\n## X\nbody\n```") }); await t.shortcut(t.ctx);
check("shortcut: strips code fence", t.getText() === "## X\nbody", JSON.stringify(t.getText()));

t = setup({ draft: "d", response: { stopReason: "aborted", content: [] } }); await t.shortcut(t.ctx);
check("shortcut: abort leaves draft", t.getText() === "d");

t = setup({ draft: "d", completeThrows: true }); await t.shortcut(t.ctx);
check("shortcut: error leaves draft + warns", t.getText() === "d" && t.notifications.some(x => /cancelled or failed/i.test(x.m)));

// ---- /optimize command ----
t = setup({ draft: "x", mode: "print" }); await t.command("", t.ctx);
check("command: non-TUI warns", t.notifications.some(x => /TUI/i.test(x.m)));

seen = "";
t = setup({ draft: "", response: ok("ok") });
t.ctx.modelRegistry.complete = async (_m, req) => { seen = req.messages[0].content[0].text; return ok("ok"); };
await t.command("make it fast", t.ctx);
check("command: args used as draft", t.getText() === "ok" && seen.includes("make it fast") && !seen.includes("Additional guidance"), seen);

t = setup({ draft: "", dialogResult: "from dialog", response: ok("ok") });
await t.command("", t.ctx);
check("command: empty input opens dialog", t.getText() === "ok" && t.editorCalls.length === 1);

t = setup({ draft: "", dialogResult: undefined });
await t.command("", t.ctx);
check("command: dialog cancel leaves draft", t.getText() === "" && t.notifications.some(x => /cancelled/i.test(x.m)));

seen = "";
t = setup({ draft: "box draft", response: ok("ok") });
t.ctx.modelRegistry.complete = async (_m, req) => { seen = req.messages[0].content[0].text; return ok("ok"); };
await t.command("be concise", t.ctx);
check("command: box draft + arg as guidance", seen.includes("box draft") && seen.includes("be concise"), seen);

let pass = 0;
for (const c of cases) { console.log((c.ok ? "PASS" : "FAIL") + "  " + c.n + (c.ok ? "" : "  -> " + c.e)); if (c.ok) pass++; }
console.log("\n" + pass + "/" + cases.length + " passed");
process.exit(pass === cases.length ? 0 : 1);
