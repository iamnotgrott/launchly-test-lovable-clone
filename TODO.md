# Forge — TODO

## Completed

- [x] Chat-driven app builder with streaming SSE
- [x] OpenRouter provider (3 models, routing, retry, fallback)
- [x] File generation & editing (create, modify, delete)
- [x] File tree with expandable folders
- [x] File editor with save (Cmd+S)
- [x] File tabs (open/close/switch)
- [x] Live preview (Vite dev server + sandboxed iframe)
- [x] Terminal panel (xterm.js with WebGL)
- [x] Git-based checkpoints (capture, diff, revert)
- [x] Diff viewer (expandable file diffs in modal)
- [x] Build error detection + AI repair loop (max 3 retries)
- [x] Token usage logging per turn
- [x] Settings page (API key, model info, data management)
- [x] Better Auth setup (email/password)
- [x] Convex schema ready (requires deployment)
- [x] API key saved to localStorage, sent via header to server
- [x] All client components have "use client" directive

## Phase 4 — Persistence & Auth

- [ ] Deploy Convex and wire up real-time persistence
  - [ ] Persist projects to Convex
  - [ ] Persist chat messages to Convex
  - [ ] Persist turns to Convex
  - [ ] Persist checkpoints to Convex
- [ ] Enforce authentication on workspace
  - [ ] Login/signup pages
  - [ ] Protect workspace routes
  - [ ] Link Convex user to projects
- [ ] Auto-save chat state to localStorage as fallback

## UX Improvements

- [ ] Auto-scroll to bottom on new messages
- [ ] Loading skeleton states for file tree and preview
- [ ] Toast notifications for save success/errors
- [ ] Command palette (Cmd+K) for quick actions
- [ ] Keyboard shortcut: Cmd+Enter to send message
- [ ] Dark/light theme toggle
- [ ] Show token usage per turn in chat
- [ ] Show model name in streaming message header
- [ ] Confirm before reverting checkpoint
- [ ] Undo last AI change (Cmd+Z)

## Feature Additions

- [ ] Project templates (React, Next.js, Vue, Svelte)
- [ ] Multi-file diff summary in chat after each turn
- [ ] Structured JSON output from LLM (instead of markdown parsing)
- [ ] Usage dashboard (token costs, model breakdown over time)
- [ ] Export project as zip
- [ ] Import project from zip
- [ ] Share project link (read-only)
- [ ] Cloud deployment (Vercel, Netlify, etc.)
- [ ] Parallel turns (queue multiple messages)
- [ ] Thread/multi-conversation support per project
- [ ] File search (fuzzy matching across project)
- [ ] Syntax highlighting in file editor
- [ ] Image attachment support in chat

## Reliability

- [ ] Retry failed API calls with exponential backoff (client-side)
- [ ] Detect and handle rate limiting from OpenRouter
- [ ] Graceful degradation when API key is missing
- [ ] Validate LLM response before applying file changes
- [ ] Sandbox file operations to project directory only
- [ ] Timeout long-running LLM calls
- [ ] Handle partial/corrupted SSE streams
- [ ] Auto-recover from failed checkpoint operations

## Performance

- [ ] Virtualize message list for long conversations
- [ ] Debounce file tree refresh
- [ ] Lazy-load file contents on open
- [ ] Cache LLM responses for identical prompts
- [ ] Optimize diff viewer for large files

## Known Issues

- Better Auth not enforced (workspace accessible without login)
- Convex not deployed (all state is in-memory, lost on refresh)
- File parsing relies on markdown code blocks (edge cases possible)
- Only one turn can execute at a time (no parallel turns)
- Preview server process not tracked (can't detect if it crashes)
