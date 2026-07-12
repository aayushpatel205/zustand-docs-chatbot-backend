# AGENTS.md — Zustand Docs RAG Chatbot

Rules for any AI agent (Claude, Copilot, etc.) working on this codebase.

## Project Snapshot
- **Goal**: RAG chatbot answering questions over local Zustand docs.
- **Stack**: JavaScript only (Node.js) — no TypeScript, no Python, ever.
- **Migration**: Genkit → LangChain.js (in progress).
- **Current phase**: Phase 1 — LangChain migration + query rewriting.

## Phase Discipline
- Work strictly within the **current phase** unless explicitly told otherwise.
- Do not pull in Phase 2+ concepts (BM25, re-ranking, LangGraph agents, MCP) while Phase 1 is incomplete.
- If a task seems to require jumping ahead, flag it and ask before proceeding.

## Code Conventions
- ES Modules only (`import`/`export`) — no `require`.
- Keep changes **surgical**: prefer minimal, targeted diffs over rewrites of working files.
- Explain new RAG/LangChain/agent concepts inline when first introduced in code or docs.
- Always spot-check / dry-run on a small sample before any bulk operation (ingestion, embedding, re-indexing).

## Directory Scanning
- When asked to "scan the whole directory/project," **skip** these paths — do not read, list deeply, or index them:
  - `node_modules/`
  - `.git/`
  - `dist/`, `build/`, `.next/`, `.expo/`
  - `coverage/`
  - `*.log`, `.DS_Store`
  - Any large raw doc dumps (e.g. `zustand_docs_raw/`, `expo_docs_raw/`) — reference their existence, don't dump contents
- If a full scan seems to require entering one of these, ask first instead of doing it silently.

## Security Rules (non-negotiable)
1. **Never read, print, log, or embed the contents of `.env` or any secret/key file** in output, chat, or committed code.
2. **Never hardcode API keys, tokens, or credentials** — always reference `process.env.VAR_NAME`.
3. **Never commit `.env`, credentials, or local doc dumps containing secrets** — verify `.gitignore` covers them.
4. **Ask before running any destructive or irreversible action**, including:
   - Deleting files or directories
   - Overwriting existing data/collections/indexes
   - Bulk ingestion or re-ingestion into the vector store
   - Installing/removing npm packages
   - Running `git push`, `git reset --hard`, force operations, or any DB drop/clear command
5. **Ask before making external network/API calls that cost money or use quota** (embedding batches, LLM calls on large datasets, re-ranker API calls).
6. **Never exfiltrate or print full contents of local doc dumps or scraped data** unless explicitly requested — summarize instead.
7. No silent scope creep: if a fix requires touching files/config outside what was asked, confirm first.

## Pending Tasks
1. **Re-add `protect` middleware to `POST /api/chat/query`** in `src/modules/chat/chat.routes.js` after testing is complete.

## When Unsure
- Prefer asking a clarifying question over guessing on anything security-, cost-, or data-destructive.
- Default to the smallest safe change that satisfies the request.
