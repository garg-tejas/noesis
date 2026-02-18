# Noesis

![Noesis demo](.github/assets/demo.webp)

**A personal AI knowledge curation platform with contradiction intelligence.**

Noesis turns scattered tweets, blogs, and videos into structured knowledge you can retrieve quickly and challenge for contradictions.

## Quick Start

```bash
git clone https://github.com/garg-tejas/noesis.git
cd noesis
pnpm install

cp .env.local.example .env.local
# add Supabase + Gemini values

# run SQL files in scripts/ using Supabase SQL editor (in order)

pnpm dev
```

Open `http://localhost:3000`.

## Problem

Saving content is easy. Building reliable understanding is hard.

Read-later workflows usually fail because:

- high-value signal is buried in low-value content
- stored knowledge is hard to retrieve when needed
- contradictory claims accumulate silently

## What Noesis Does

- **AI Distillation:** Extracts core ideas, context, actionables, and quality scores (0-100) from Twitter threads, blog posts, and YouTube videos
- **Smart Retrieval:** Server-side search across all entries with filters for source type, tags, and quality threshold
- **Contradiction Intelligence:** Analyzes semantically related entries (grouped by tags) and surfaces conflicting claims with explanations
- **Personal Layer:** Favorite entries, add notes, and track contradiction timeline in your knowledge base

## Core API

| Endpoint                   | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `POST /api/distill`        | Extract structured knowledge from raw content |
| `GET /api/entries`         | Server-side search, filters, and pagination   |
| `POST /api/contradictions` | Analyze entries for conflicting claims        |
| `GET /api/stats`           | Dashboard analytics (quality, sources, tags)  |

All endpoints enforce auth + input validation.

## Technical Highlights

- Contradiction detection algorithm: avoids expensive all-pairs comparison by pre-grouping entries with shared tags, then filters out self-references and invalid pairs before sending to Gemini.
- Server-side search with pagination: query params are validated in `GET /api/entries`, then filtered by search text, tags, source, and quality.
- Rate limiting on AI-heavy routes: fixed-window limits on `/api/distill` and `/api/contradictions` keyed by user + client IP.
- Canonicalized persistence: contradiction pairs are normalized (`item1_id < item2_id`), deduped in service logic, and reinforced with SQL uniqueness constraints.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Data + Security:** Supabase Postgres, Supabase Auth, RLS-enabled core tables
- **AI:** Google GenAI (Gemini)
- **UI + Deploy:** Tailwind CSS, Radix UI, Vercel

## Limitations

- Contradiction detection still requires human judgment to validate claims
- Quality scores depend on model prompt quality and can drift
- Optimized for personal use (single-user); not designed for team collaboration yet
- No PDF or academic paper ingestion (text/YouTube only)

## What I Learned

- The hard part is not just generating summaries; it is preserving retrieval quality as the dataset grows.
- Contradiction detection becomes noisy and expensive without strong pre-filtering before model calls — naive all-pairs comparison on 100 entries would cost 4,950 API calls; tag-based grouping reduces this to ~50.
- AI-backed write paths need idempotency primitives (canonical ordering + dedupe) to keep persistence clean.
- Reliability comes from boundaries: schema validation, timeout/retry handling, and route-level throttling.
