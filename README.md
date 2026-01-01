# Noesis 🧠

I kept saving tweets and articles to read later and never actually reading them. So I built this to help me actually remember the stuff I save.

Basically it uses AI to pull out the important bits from things I read and puts them somewhere I can search through later.

## What it does

**Content stuff**

- You paste in a tweet thread, blog post or YT link
- AI figures out what the main ideas are
- It scores how useful the content is (filters out fluff)
- Auto-tags things so you can find them

**Search**

- Search through everything you've saved
- Filter by tags
- There's a slider to only show high-quality stuff

**Contradiction finder**

- This one's cool - it finds places where your saved notes contradict each other
- Only compares related topics (so it won't flag a cooking post vs a programming post)
- Adds the contradictions right into your notes

**Notes**

- You can add your own thoughts to entries
- They stick around with the entry

**Favorites**

- Star the important ones
- Browse through them in a card layout

---

## Getting it running

You'll need:

- Node.js (18 or newer)
- pnpm
- Supabase account (free tier works)
- Gemini API key

```bash
git clone https://github.com/garg-tejas/noesis.git
cd noesis
pnpm install
```

Make a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_gemini_api_key
```

Run the SQL files in the `scripts/` folder to set up your database.

Then:

```bash
pnpm dev
```

Go to `http://localhost:3000` and you should be good.

---

## How it works

When you add something new:

1. Sends the text to Gemini
2. Pulls out the actual ideas (removes the fluff)
3. Makes up some questions and key takeaways
4. Scores how information-dense it is
5. Auto-tags it
6. Saves to Supabase

Then you can search through it immediately.

**The contradiction thing:**

It only compares entries that are about similar topics. So if you have two blog posts about reinforcement learning that say different things, it'll catch that. But it won't compare a RL post to something random about philosophy.

---

## Tech stuff

- Next.js with the App Router
- Supabase for the database
- Gemini API for the AI part
- Tailwind CSS + Radix UI components
- TypeScript
- Deployed on Vercel

---

## Using it

**Adding stuff:**

- Click "Distill New"
- Pick if it's a tweet, blog post or yt video
- Paste the content
- Save it

**Finding things:**

- Search bar for keywords
- Filter by tags or source type
- Quality slider if you only want the good stuff

**Finding contradictions:**

- Hit "Find Contradictions"
- It'll show you entries that clash
- You can add notes to resolve them

---

## Project structure

```
noesis/
├── app/              # Next.js pages
├── components/       # React components
├── services/         # API calls and business logic
├── lib/              # utility functions
└── scripts/          # database setup
```

There's comments in the code if you want more details.

---

## Privacy

Everything stays in your own Supabase database. Row-level security is turned on so nobody else can see your data. API keys are server-side only.

---

## Deploying

Should be pretty straightforward on Vercel:

- Push to GitHub
- Import the repo in Vercel
- Add your environment variables
- Update the redirect URLs in Supabase settings
- Deploy

---

## Why "Noesis"?

It's a Greek philosophy term that means understanding through direct insight.

The whole point isn't to replace actually reading things - it's more about helping you figure out what's worth reading deeply vs what you can skim or skip entirely.

Saving bookmarks is easy. Actually understanding and remembering what you read is hard. This is supposed to help with that.
