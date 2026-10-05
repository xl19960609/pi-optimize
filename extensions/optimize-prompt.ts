/**
 * Prompt optimizer — rewrite the current input-box draft into a clearer, structured prompt.
 *
 * Trigger:
 *   Alt+O                       Optimize the draft currently in the input box, in place.
 *   /optimize                   Open an editor to paste/type a draft, then optimize it.
 *   /optimize be concise        Same, with extra guidance appended.
 *   /optimize <draft text>      Optimize the given text directly.
 *
 * Behavior:
 *   - The active model rewrites the draft; the result replaces the input box content.
 *   - Nothing is sent automatically. Review, then submit yourself.
 *   - The rewrite keeps the draft's language and intent and only adds clarity and
 *     structure (goal / context / requirements / constraints / output).
 *
 * Why a shortcut? Pi clears the editor before an extension command handler runs,
 * so a slash command cannot read the draft that was in the box. A shortcut fires
 * without touching the editor, so Alt+O can read and rewrite it in place.
 *
 * Load: place in ~/.pi/agent/extensions/ (loaded automatically) or run
 *   pi --extension ./optimize-prompt.ts
 */

import { type Message, uuidv7 } from "@earendil-works/pi-ai";
import {
	BorderedLoader,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";

const SYSTEM_PROMPT = `You rewrite a user's rough draft into a better prompt for an AI coding agent.

Goals:
- Preserve the user's original intent, language, and every concrete detail (paths, names, versions, numbers, constraints).
- Make the prompt clear, specific, and unambiguous.
- Add only structure that genuinely helps, for example: goal, context, requirements, constraints, expected output, and how to verify success.
- Never invent requirements, files, APIs, or facts that the draft does not imply. If something is missing, leave it out rather than guessing.
- Keep it as short as possible while remaining unambiguous. Do not pad or over-explain.

Output rules:
- Reply with ONLY the improved prompt.
- No preamble, no explanation, no surrounding quotes, no markdown code fence around the whole thing.
- Keep the same language as the draft (e.g. Chinese draft -> Chinese prompt).`;

/** Rewrite one draft with the active model. Returns the improved prompt, or null on cancel/failure. */
async function optimizeDraft(
	ctx: ExtensionContext,
	draft: string,
	extra: string,
): Promise<string | null> {
	const model = ctx.model;
	if (!model) {
		ctx.ui.notify("No active model selected.", "error");
		return null;
	}

	const userText = extra
		? `## Draft\n\n${draft}\n\n## Additional guidance from the user\n\n${extra}`
		: `## Draft\n\n${draft}`;

	return ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
		const loader = new BorderedLoader(tui, theme, `Optimizing prompt (${model.id})…`);
		loader.onAbort = () => done(null);

		const run = async () => {
			const message: Message = {
				role: "user",
				content: [{ type: "text", text: userText }],
				timestamp: Date.now(),
			};
			const response = await ctx.modelRegistry.complete(
				model,
				{ systemPrompt: SYSTEM_PROMPT, messages: [message] },
				{ signal: loader.signal, cacheRetention: "none", sessionId: uuidv7() },
			);
			if (response.stopReason === "aborted") return null;
			const text = response.content
				.filter((c): c is { type: "text"; text: string } => c.type === "text")
				.map((c) => c.text)
				.join("\n")
				.trim();
			if (!text) return null;
			// Strip a single wrapping code fence if the model added one.
			const fenced = text.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
			return (fenced ? fenced[1] : text).trim();
		};

		run()
			.then(done)
			.catch((error) => {
				console.error("optimize failed:", error);
				done(null);
			});

		return loader;
	});
}

export default function optimizePromptExtension(pi: ExtensionAPI): void {
	// In-place optimization: the editor keeps its content, so we can read the draft.
	pi.registerShortcut(Key.alt("o"), {
		description: "Optimize the current input draft (/optimize)",
		handler: async (ctx) => {
			if (ctx.mode !== "tui") return;
			const before = ctx.ui.getEditorText();
			const draft = before.trim();
			if (!draft) {
				ctx.ui.notify("Input box is empty — type a draft first.", "warning");
				return;
			}
			const result = await optimizeDraft(ctx, draft, "");
			if (result === null) {
				ctx.ui.notify("Optimize cancelled or failed — draft unchanged.", "warning");
				return;
			}
			ctx.ui.setEditorText(result);
			ctx.ui.notify(
				result === before.trim()
					? "Prompt looked good already — left as is."
					: "Prompt optimized — review, then submit.",
				"info",
			);
		},
	});

	pi.registerCommand("optimize", {
		description: "Optimize a prompt draft (Alt+O optimizes the input box in place)",
		handler: async (args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("/optimize requires interactive (TUI) mode", "warning");
				return;
			}

			const extra = args.trim();
			// The editor is cleared before a command runs, so use the box if it still
			// has content, else treat the argument as the draft, else open an editor.
			let draft = ctx.ui.getEditorText().trim();
			let guidance = "";
			if (!draft && extra) {
				draft = extra;
			} else {
				guidance = extra;
			}

			if (!draft) {
				const entered = await ctx.ui.editor("Draft to optimize", "");
				if (entered === undefined) {
					ctx.ui.notify("Optimize cancelled.", "warning");
					return;
				}
				draft = entered.trim();
			}

			if (!draft) {
				ctx.ui.notify("Nothing to optimize.", "warning");
				return;
			}

			const result = await optimizeDraft(ctx, draft, guidance);
			if (result === null) {
				ctx.ui.notify("Optimize cancelled or failed — draft unchanged.", "warning");
				return;
			}
			ctx.ui.setEditorText(result);
			ctx.ui.notify("Prompt optimized — review, then submit.", "info");
		},
	});
}
