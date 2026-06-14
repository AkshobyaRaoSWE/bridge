<div align="center">
  <img src="https://akshobyaraoswe.github.io/bridge/bridge_logo.png" alt="Bridge" height="56" />
  <h1>Bridge</h1>
  <p><b>Run AI coding agents in isolated contexts, then merge them temporarily to ship better code, faster.</b></p>
  <p>A native macOS desktop app for Claude Code, Codex, and Gemini — one clean UI, with streaming, interactive approvals, and slash commands for all three.</p>
  <p>
    <a href="https://akshobyaraoswe.github.io/bridge/">Website</a> ·
    <a href="https://github.com/AkshobyaRaoSWE/bridge/releases/latest">Download</a> ·
    <a href="#install">Install</a> ·
    <a href="#development">Develop</a>
  </p>
</div>

---

## What it is

Bridge is a desktop client that lets you run multiple AI coding agents side by side, each in its own **context** (isolated chat + working folder + session). When you want a unified view, you **merge** contexts into a temporary scratch chat that carries the combined work without touching the originals. It runs the agents **locally** on your machine — there is no Bridge server, no telemetry, and your code is never sent anywhere except to the model provider you chose.

Three engines, one interface:

| Engine | Runs via | Interactive approvals | Streaming | Slash commands |
|---|---|---|---|---|
| **Claude Code** | `@anthropic-ai/claude-agent-sdk` | Yes (`canUseTool`) | Yes | Built-in + discovered + skills |
| **Codex** | `codex app-server` (JSON-RPC) | Yes (exec / file / permission / user-input) | Yes | Skills + functional (`/review`, `/compact`, `/init`, `/goal`) |
| **Gemini** | `gemini --acp` (Agent Client Protocol) | Yes (`session/request_permission`) | Yes | ACP `available_commands` |

---

## Features

- **Parallel contexts** — many agents at once, each with its own chat, folder, and branch label.
- **Temporary merges** — combine contexts (even across engines) into a throwaway chat; originals stay untouched. A new chat + optional auto-merge is also created when you switch a context's folder or engine.
- **Interactive approvals** — approve/deny every file edit and shell command, plus arrow-key option prompts (AskUserQuestion-style), for all three engines.
- **Per-engine slash commands** — a fast arrow-key palette with Bridge commands plus each engine's own commands.
- **Live status** — per-context engine, mode, working folder, token usage, cost (Claude), message count, git changes, and session id.
- **Settings** — appearance (system/light/**dark** theme), permission modes, privacy toggles that write real Claude Code env vars to `~/.claude/settings.json`, model/config, notifications, engine setup + connection tests, and updates.
- **Focus mode** (`⌘.`) — distraction-free, full-screen chat.
- **Self-contained** — bundles its own Node runtime and a single-file sidecar; nothing else to install.
- **Auto-updates** — signed in-app updates for Bridge, and one-click updates for each engine.
- **Native** — Tauri (Rust + WKWebView), notifications, fast.

---

## Install

macOS, **Apple Silicon (arm64)**.

**Recommended — one command, no security prompt:**

```sh
curl -fsSL https://github.com/AkshobyaRaoSWE/bridge/releases/latest/download/install.sh | bash
```

This downloads the latest release, installs to `/Applications`, and launches it. Because it is fetched with `curl` (not a browser), macOS does not quarantine it.

**Manual download:** grab `Bridge.app.tar.gz` from the [latest release](https://github.com/AkshobyaRaoSWE/bridge/releases/latest). Because the app is not yet Apple-notarized, a browser download will be blocked the first time ("can't verify... free of malware"). On recent macOS, right-click → Open no longer bypasses this. Do one of:

1. Move Bridge to `/Applications`, then run `xattr -dr com.apple.quarantine /Applications/Bridge.app` and open it.
2. Double-click → **Done** → **System Settings → Privacy & Security** → **Open Anyway** → confirm.

> The curl installer avoids all of the above. Notarization (a paid Apple Developer ID) removes the prompt for browser downloads too; that is the one remaining distribution step.

---

## Engines & authentication

Bridge drives the official CLIs, so it uses their own auth. Install/connect each from **Settings → Engines** (it detects what's present and has a live "Test connection"). The app bundles Node, so the CLIs are the only external pieces.

- **Claude Code** — `npm i -g @anthropic-ai/claude-code`; sign in with `claude`, or set `ANTHROPIC_API_KEY`.
- **Codex** — `npm i -g @openai/codex`; `codex login` (the Engines panel opens a Terminal for this), or `CODEX_API_KEY` / `OPENAI_API_KEY`.
- **Gemini** — `npm i -g @google/gemini-cli`; set a `GEMINI_API_KEY` (Settings has a field that writes it to `~/.gemini/.env`). The free Google sign-in is age/tier-restricted on some accounts, so an API key is the reliable path.

macOS GUI apps don't inherit your shell env, so Bridge injects your login-shell environment into the CLIs it spawns. Keys exported in `~/.zshrc` are picked up.

---

## Architecture

```
React UI (Vite + TS + Tailwind)
   │  state: a singleton Store (useSyncExternalStore) + localStorage
   │  Tauri command: agent_send   Tauri event: agent-event
Rust backend (src-tauri/src/lib.rs)
   │  spawns the bundled Node + sidecar; bridges NDJSON over stdio to the webview
   │  commands: run_git, installed_agents, test_agent, update_agent,
   │            runtime_status, set_gemini_key, codex_login, ...
Node sidecar (sidecar/bridge-agent.mjs, bundled to one file via esbuild)
   ├─ claude  → @anthropic-ai/claude-agent-sdk query() + canUseTool
   ├─ codex   → codex app-server  (JSON-RPC: thread/start, turn/start, approvals)
   └─ gemini  → gemini --acp       (JSON-RPC: session/new, session/prompt, permissions)
```

All three engines are translated into the **same event shapes** so the UI renders uniformly. Interactive approvals from every engine route into one shared permission UI.

Key points:
- The sidecar is **esbuild-bundled to a single ~1MB file** (no `node_modules` shipped), and Node is bundled as a Tauri `externalBin`, so the app is self-contained.
- Switching a context's **folder** or **engine** opens a fresh chat (Claude namespaces sessions by folder; engines can't move) plus an optional temporary merge that carries prior context across.
- The merge chat seeds the target engine with a combined transcript and never mutates the source contexts.

### Project layout

```
src/                React app
  App.tsx             all UI (dashboard, chat, settings, onboarding, panels)
  lib/store.ts        Store singleton: state, sidecar bridge, engine logic
  lib/types.ts        Workspace, FeedItem, engine + mode metadata
  components/Logo.tsx
src-tauri/          Rust backend (lib.rs), tauri.conf.json, capabilities, binaries/
sidecar/            bridge-agent.mjs (source) -> dist/bridge-agent.mjs (bundled)
scripts/smoke.mjs   automated engine smoke test
site/               landing page (deployed to GitHub Pages)
release.sh          build + sign + publish a release
install.sh          one-line installer (shipped as a release asset)
TESTING.md          full manual test checklist
```

---

## Development

Requirements: Rust toolchain, Node, and the Tauri CLI (`npm i`). For releases you also need the updater signing key (see below).

```sh
npm install
npm run tauri dev        # run in dev (hot reload)
npm run build            # bundles sidecar (esbuild) + type-checks + vite build
npm run tauri build -- --bundles app    # build the .app
```

Build env (only needed because updater artifacts are enabled):

```sh
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.bridge/updater.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
```

---

## Testing

**Automated engine smoke test** — verifies streaming, token usage, and the interactive approval round-trip for each installed engine through the real sidecar:

```sh
node scripts/smoke.mjs          # all engines
node scripts/smoke.mjs codex    # one engine
```

Exits 0 if all pass. **Manual GUI checklist:** see [`TESTING.md`](TESTING.md).

---

## Releasing & updates

Bridge self-updates via the Tauri updater, with releases hosted on GitHub Releases. To push an update to every install:

```sh
./release.sh <version> "release notes"
# e.g. ./release.sh 0.1.5 "Fix the merge animation."
```

`release.sh` bumps the version in `tauri.conf.json` / `package.json` / `Cargo.toml`, builds, re-signs the app, repackages + signs the updater artifact, writes `latest.json`, and publishes the GitHub release. Running installs detect it in **Settings → Updates → Check for updates**.

> The updater signing key lives at `~/.bridge/updater.key`; the matching public key is embedded in the app. **Back the private key up** — if it's lost, no future update can be signed. Never commit it.

---

## Privacy

Bridge runs the agents locally. It has no servers and collects no telemetry. The only network traffic is each engine talking to its own provider's API (Anthropic / OpenAI / Google) to run the model. The Privacy settings can also flip Claude Code's own non-essential traffic flags (telemetry, error reporting, auto-update) in `~/.claude/settings.json`.

---

## Status & limitations

Working and verified: all three engines (streaming, approvals, resume, tokens), merges, switching, slash commands, dark mode, focus mode, self-contained build, and self-update.

Not done yet:
- **Apple notarization** (needs a paid Developer ID) — until then the curl installer or the quarantine workaround is required for distribution to other Macs.
- **Apple Silicon only** — Intel/universal build pending.
- Codex/Gemini report token counts but not USD cost (only Claude exposes cost).

---

## License

[ASSUMPTION] No license file is present yet; add one (e.g. MIT) before distributing the source.
