# Forge — AI App Builder

Build web applications through natural language conversation. Describe what you want, and the system generates code, creates files, and helps you iterate.

## Features

- **Chat-driven development** — Describe your app in natural language
- **File generation & editing** — AI creates and modifies project files
- **Diff display** — See exactly what changed in each turn (expandable file diffs)
- **Live preview** — Run generated apps in an embedded preview
- **File tree** — Browse and edit files manually
- **Terminal** — Run commands, see build output (xterm.js with WebGL)
- **Checkpoints & rollback** — Git-based version history, revert to any turn
- **Build error repair** — Automatic build detection, error summary, and AI repair loop
- **Model routing** — Smart model selection (fast for simple tasks, powerful for complex ones)
- **Retry & fallback** — Automatic retry with model fallback on errors
- **Token usage logging** — Track prompt/completion tokens per turn
- **Settings page** — API key management, model info, data controls

## Tech Stack

- **Frontend**: Next.js App Router + React + TypeScript
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **LLM**: OpenRouter API (qwen/qwen3.6-plus:free, stepfun/step-3.5-flash:free, nvidia/nemotron-3-super-120b-a12b:free)
- **Preview**: Vite dev server spawned locally
- **Terminal**: xterm.js with WebGL renderer
- **Version control**: simple-git for checkpoint management
- **Auth**: Better Auth (email/password, session management)
- **DB**: Convex schema ready (requires deployment)

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env.local
   ```
   Add your OpenRouter API key and auth secret to `.env.local`:
   ```
   OPENROUTER_API_KEY=your-key-here
   BETTER_AUTH_SECRET=$(openssl rand -base64 32)
   BETTER_AUTH_URL=http://localhost:3000
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000)

## Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main workspace
│   ├── settings/page.tsx         # Settings page
│   ├── api/
│   │   ├── files/                # Unified file CRUD
│   │   ├── projects/create       # Project creation
│   │   ├── turn/execute          # SSE turn execution (plan → code → build → repair)
│   │   ├── checkpoints           # Git checkpoint capture/diff/revert
│   │   ├── terminal/run          # Command execution with SSE output
│   │   ├── preview/              # Vite dev server start/stop
│   │   └── auth/[...all]/        # Better Auth handler
├── components/
│   ├── chat/                     # ChatView, MessageList, MessageBubble, Composer
│   ├── files/                    # FileTree, FilePanel, FileTabs, FileEditor, CheckpointPanel
│   ├── diff/                     # DiffViewer (expandable file diffs)
│   ├── terminal/                 # TerminalPanel (xterm.js)
│   ├── preview/                  # PreviewFrame (sandboxed iframe)
│   ├── layout/                   # Sidebar, ProjectList
│   └── ui/                       # Button, Card
├── lib/
│   ├── openrouter/               # Provider: config, client, model router
│   └── filesystem/               # Server: manager, validator, diff utils
├── prompts/                      # system, project-creation, code-edit, error-repair, planning
├── store/                        # chatStore, projectStore, checkpointStore
└── types/                        # Shared TypeScript types
```

## How It Works

1. **Create a project** — Enter a name in the Projects panel
2. **Describe your app** — Type a prompt in the chat
3. **AI plans and executes** — The system:
   - Plans the changes (fast model)
   - Creates a git checkpoint before changes
   - Generates/edits files (default model, streamed)
   - Runs `vite build` to verify
   - Auto-repairs build errors (fallback model, max 3 retries)
   - Creates a post-change git checkpoint
   - Logs token usage
4. **Preview** — Click Preview to spawn Vite dev server in iframe
5. **Terminal** — Click Terminal to run any command with xterm.js output
6. **History** — View checkpoints, see diffs, revert to any previous state
7. **Iterate** — Continue refining through chat

## Model Routing

| Task | Model | Purpose |
|------|-------|---------|
| Planning | stepfun/step-3.5-flash:free | Fast, cheap |
| Code Generation | qwen/qwen3.6-plus:free | Default, balanced |
| Error Repair | nvidia/nemotron-3-super-120b-a12b:free | Heavy reasoning |

## Turn Lifecycle

```
User prompt
  → Plan (FAST model)
  → Pre-change checkpoint (git)
  → Generate code (DEFAULT model, streamed)
  → Apply file changes
  → Run vite build
  → If build fails:
      → Repair attempt (FALLBACK model)
      → Retry build (max 3 times)
  → Post-change checkpoint (git)
  → Log token usage
  → Stream result to client
```

## Security

- Path validation prevents directory traversal
- File operations restricted to project workspace
- No secrets exposed in frontend (API key in env, not client)
- Preview runs in sandboxed iframe
- Shell commands executed with explicit cwd restriction

## Tradeoffs & Known Issues

- **In-memory state**: Chat/project state is in Zustand. Refreshing loses state. Convex schema is ready but requires deployment.
- **Auth not enforced**: Better Auth is set up but the workspace page doesn't require login yet.
- **No cloud deployment**: Preview runs on localhost only.
- **File parsing**: AI file changes parsed from markdown code blocks. Edge cases possible.
- **Sequential turns**: Only one turn can execute at a time (no parallel turns).

## Next Improvements

1. Deploy Convex and wire up persistence
2. Enforce authentication on workspace
3. Add project templates (React, Next.js, Vue, etc.)
4. Add multi-file diff summary in chat
5. Improve file parsing with structured JSON output
6. Add usage dashboard (token costs, model breakdown)
7. Add keyboard shortcuts (Cmd+K command palette)
8. Add dark/light theme toggle

## License

MIT
