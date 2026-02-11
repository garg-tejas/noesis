# Noesis

**Turn saved content into remembered knowledge.**

Noesis extracts high-signal ideas from tweets, articles, and videos, stores them as searchable insights, and flags contradictions across what you’ve saved—so you don’t accumulate unread links or internalize conflicting information.

---

## Quick Start

```bash
git clone https://github.com/garg-tejas/noesis.git
cd noesis
pnpm install

cp .env.example .env.local
# fill in API keys

# Run SQL files in scripts/ using Supabase SQL editor

pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Problem

Saving content is frictionless. Understanding and retaining it isn’t.

Articles, threads, and videos accumulate faster than they can be read, revisited, or reconciled. Even when content is consumed, key ideas fade and contradictions go unnoticed.

**Noesis focuses on three failures of “read later” workflows:**

* High-value insights are buried among low-signal content
* Knowledge is stored but not retrievable
* Conflicting ideas accumulate without being surfaced

---

## What Noesis Does

### Content Distillation

* Accepts tweet threads, blog posts, and YouTube transcripts
* Extracts core ideas while filtering filler
* Generates key takeaways and questions
* Assigns an information-density score (1–10)
* Auto-tags entries for retrieval

### Search & Retrieval

* Full-text search across all saved content
* Filter by tag, source, or quality threshold
* Quality slider to hide low-signal entries

### Contradiction Detection

* Detects conflicting claims across saved content
* Comparisons are limited to **semantically related topics**
* Contradictions are attached directly to affected entries
* Designed to surface tension—not automatically resolve it

### Personal Knowledge Layer

* Attach personal notes and reflections
* Star high-value entries
* Dedicated favorites view for fast review

---

## Key Design Decisions

* **Quality over completeness**
  Not all content deserves equal retention; scoring and filtering are first-class.

* **Constrained semantic comparison**
  Contradictions are only checked within related topics to reduce cost and false positives.

* **Ingestion-time processing**
  Expensive AI work happens upfront so search stays fast and predictable.

* **Single-user scope**
  Optimized for individual knowledge building, not collaboration.

---

## How It Works

**Ingestion Pipeline**

1. User submits content (URL or text)
2. Gemini extracts core concepts and claims
3. Content is scored, tagged, and summarized
4. Data is stored in Supabase with full-text indexing

**Contradiction Detection**

* Entries are compared only when topic similarity exceeds a threshold
* Example: conflicting claims across AI articles are flagged
* Unrelated domains are never compared (e.g., cooking vs. programming)

---

## Tech Stack

* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **Database:** Supabase (Postgres + RLS)
* **AI:** Gemini 2.5 Flash
* **Styling:** Tailwind CSS + Radix UI
* **Deployment:** Vercel

---

## Limitations

* No PDF or academic paper support
* Contradictions require human judgment to resolve
* Quality scoring is model-dependent and subjective
* Optimized for personal-scale datasets

---

## Project Structure

```
noesis/
├── app/              # Routes and layouts
├── components/       # UI and feature components
├── services/         # AI + database orchestration
├── lib/              # Shared utilities
├── types/            # Type definitions
└── scripts/          # Database migrations
```

---

## Privacy & Security

* All data lives in your own Supabase instance
* Row-level security enabled on all tables
* API keys never exposed client-side
* Content is sent to Gemini only for processing (no long-term storage)

---

## Philosophy

*Noesis* refers to understanding through direct insight.

This tool doesn’t replace reading. It helps you decide:

* What deserves deep attention
* What can be skimmed or discarded
* Where your understanding conflicts with itself

Saving is easy. Understanding is not.

---

## Roadmap (Non-Commitment)

* PDF and academic paper ingestion
* Knowledge graph visualization
* Spaced repetition for high-value content
* Export to Obsidian / Notion
* Browser extension for capture
