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
- **Model routing** — Smart model selection (Nemotron 120B default, with user-selectable alternatives)
- **Retry & fallback** — Automatic retry with model fallback on errors
- **Token usage logging** — Track prompt/completion tokens per turn
- **Settings page** — API key management, model info, data controls
- **Persistence** — Convex backend for projects, messages, turns, and checkpoints
- **Auth** — Better Auth (email/password) ready for deployment

## Tech Stack

- **Frontend**: Next.js App Router + React + TypeScript
- **Styling**: Tailwind CSS v4
- **State**: Zustand (client UI state) + Convex (server persistence)
- **LLM**: OpenRouter API (nvidia/nemotron-3-super-120b-a12b:free default, with fallbacks)
- **Preview**: Vite dev server spawned locally
- **Terminal**: xterm.js with WebGL renderer
- **Version control**: simple-git for checkpoint management
- **Auth**: Better Auth (ready for email/password)
- **DB**: Convex (deployed via `npx convex dev`)

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env.local
   ```
   Add your OpenRouter API key to `.env.local`:
   ```
   OPENROUTER_API_KEY=your-key-here
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```
   This starts two processes:
   - Next.js dev server (http://localhost:3000)
   - Convex dev server (deploys schema and provides real-time backend)

4. **Wait for Convex deployment** — The first time you run `npm run dev`, you'll see Convex output like:
   ```
   ✓ Your project is deployed at: https://your-project.convex.cloud
   ```
   Copy that URL and add it to `.env.local`:
   ```
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   ```
   Then restart `npm run dev`.

5. **Open** [http://localhost:3000](http://localhost:3000)

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
├── components/                   # React components
│   ├── chat/                     # ChatUI (messages, composer)
│   ├── files/                    # FileTree, FilePanel, FileTabs, FileEditor, CheckpointPanel
│   ├── diff/                     # DiffViewer (expandable file diffs)
│   ├── terminal/                 # TerminalPanel (xterm.js)
│   ├── preview/                  # PreviewFrame (sandboxed iframe)
│   ├── layout/                   # Sidebar, ProjectList, ModelSelector
│   └── ui/                       # UI primitives (Button, Card, Toast, Skeleton)
├── lib/
│   ├── openrouter/               # OpenRouter provider (config, client, model router)
│   ├── filesystem/               # File operations (manager, validator, diff)
│   └── convex/                   # Convex client wrapper
├── prompts/                      # system, project-creation, code-edit, error-repair, planning
├── store/                        # chatStore, projectStore, checkpointStore, toastStore
├── types/                        # Shared TypeScript types
└── convex/                       # Convex schema
```

## How It Works

1. **Create a project** — Enter a name in the Projects panel
2. **Describe your app** — Type a prompt in the chat
3. **AI plans and executes** — The system:
   - Plans the changes (using selected model)
   - Creates a git checkpoint before changes
   - Generates/edits files (streamed or fallback)
   - Runs `vite build` to verify
   - Auto-repairs build errors (max 3 retries)
   - Creates a post-change git checkpoint
   - Logs token usage
   - Persists all changes to Convex
4. **Preview** — Click Preview to spawn Vite dev server in iframe
5. **Terminal** — Click Terminal to run any command with xterm.js output
6. **History** — View checkpoints, see diffs, revert to any previous state
7. **Iterate** — Continue refining through chat; all data persists across refreshes

## Model Selection

Use the ⚡ Model Selector in the top bar to choose:
- **Nemotron 120B** (default) — Most reliable free model
- **Qwen 3.6 Plus** — Faster but rate limited
- **Step 3.5 Flash** — Fastest, least reliable

Your selection persists in localStorage.

## Persistence

All data is stored in Convex:
- **Projects** — name, description, workspace path
- **Messages** — chat history with token usage
- **Turns** — each AI turn with files changed, status, errors
- **Checkpoints** — git-based version history for rollback

## Quick Start (Detailed)

```bash
# 1. Install
npm install

# 2. Set API key
echo "OPENROUTER_API_KEY=your-key-here" > .env.local

# 3. Start dev (this will show your Convex URL)
npm run dev

# 4. In another terminal, watch for:
#    ✓ Your project is deployed at: https://abc123.convex.cloud
#    Copy that URL

# 5. Stop dev (Ctrl+C), then add to .env.local:
echo "NEXT_PUBLIC_CONVEX_URL=https://abc123.convex.cloud" >> .env.local

# 6. Restart dev
npm run dev

# 7. Open http://localhost:3000
```

## License

MIT