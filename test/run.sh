#!/usr/bin/env bash
# Self-contained headless logic test for extensions/optimize-prompt.ts.
#
# It creates a throwaway workspace with stub @earendil-works packages (so the
# extension can be imported without a running Pi), copies the extension and
# test.mjs into it, and runs the suite with Node's TypeScript type stripping.
#
# Usage:  bash test/run.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
WORK="$(mktemp -d 2>/dev/null || mktemp -d -t pi-optimize-test)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p \
  "$WORK/node_modules/@earendil-works/pi-ai" \
  "$WORK/node_modules/@earendil-works/pi-coding-agent" \
  "$WORK/node_modules/@earendil-works/pi-tui"

cat > "$WORK/node_modules/@earendil-works/pi-ai/package.json" <<'EOF'
{ "name": "@earendil-works/pi-ai", "version": "0.0.0", "type": "module", "main": "index.js" }
EOF
cat > "$WORK/node_modules/@earendil-works/pi-ai/index.js" <<'EOF'
export function uuidv7() { return "test-uuid-0000"; }
EOF

cat > "$WORK/node_modules/@earendil-works/pi-coding-agent/package.json" <<'EOF'
{ "name": "@earendil-works/pi-coding-agent", "version": "0.0.0", "type": "module", "main": "index.js" }
EOF
cat > "$WORK/node_modules/@earendil-works/pi-coding-agent/index.js" <<'EOF'
export class BorderedLoader {
  constructor(tui, theme, message) {
    this.tui = tui; this.theme = theme; this.message = message;
    this.signal = undefined; this.onAbort = undefined;
  }
}
EOF

cat > "$WORK/node_modules/@earendil-works/pi-tui/package.json" <<'EOF'
{ "name": "@earendil-works/pi-tui", "version": "0.0.0", "type": "module", "main": "index.js" }
EOF
cat > "$WORK/node_modules/@earendil-works/pi-tui/index.js" <<'EOF'
const mk = (mod) => (k) => mod + "+" + k;
export const Key = { alt: mk("alt"), ctrl: mk("ctrl"), shift: mk("shift"), ctrlShift: (k) => "ctrl+shift+" + k };
EOF

cp "$ROOT/extensions/optimize-prompt.ts" "$WORK/optimize-prompt.ts"
cp "$HERE/test.mjs" "$WORK/test.mjs"

cd "$WORK"
node --experimental-strip-types test.mjs
