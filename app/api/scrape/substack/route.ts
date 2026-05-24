import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { errorResponse } from "@/lib/api/errors"

interface SubstackPost {
  title?: string
  subtitle?: string
  body_html?: string
  body_text?: string
  post_date?: string
  canonical_url?: string
  author?: { name?: string }
}

function extractPublicationUrl(input: string): string | null {
  try {
    const url = new URL(input)
    // Must be a substack.com domain or a custom domain pointing to substack
    // We accept any URL — the /api/v1/posts endpoint will 404 if it's not Substack
    return `${url.protocol}//${url.hostname}`
  } catch {
    return null
  }
}

function extractSlug(input: string): string | null {
  try {
    const url = new URL(input)
    // Substack post URLs: /p/<slug>
    const match = url.pathname.match(/^\/p\/([^/]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

function htmlToText(html: string): string {
  // Basic HTML → plain text: strip tags, decode common entities
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorResponse(401, "UNAUTHORIZED", "Authentication required")
  }

  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "BAD_REQUEST", "Malformed JSON body")
  }

  const { url } = body
  if (!url || typeof url !== "string") {
    return errorResponse(400, "VALIDATION_FAILED", "url is required")
  }

  const publicationBase = extractPublicationUrl(url)
  if (!publicationBase) {
    return errorResponse(400, "VALIDATION_FAILED", "Invalid URL")
  }

  const slug = extractSlug(url)

  try {
    let post: SubstackPost

    if (slug) {
      // Fetch a specific post by slug
      const apiUrl = `${publicationBase}/api/v1/posts/${slug}`
      const res = await fetch(apiUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Noesis/1.0)" },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) {
        return errorResponse(
          502,
          "UPSTREAM_ERROR",
          `Substack API returned ${res.status}. Check that the URL is a valid public Substack post.`
        )
      }
      post = (await res.json()) as SubstackPost
    } else {
      // No slug — fetch the latest post from the publication
      const apiUrl = `${publicationBase}/api/v1/posts?limit=1`
      const res = await fetch(apiUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Noesis/1.0)" },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) {
        return errorResponse(
          502,
          "UPSTREAM_ERROR",
          `Substack API returned ${res.status}. Check that the URL points to a valid Substack publication.`
        )
      }
      const posts = (await res.json()) as SubstackPost[]
      if (!posts || posts.length === 0) {
        return errorResponse(404, "UPSTREAM_ERROR", "No posts found on this Substack publication.")
      }
      post = posts[0]
    }

    // Build plain text from the post
    const bodyText =
      post.body_text ||
      (post.body_html ? htmlToText(post.body_html) : null)

    if (!bodyText) {
      return errorResponse(
        422,
        "UPSTREAM_ERROR",
        "Could not extract text from this post. It may be paywalled or empty."
      )
    }

    const header = [
      post.title ? `# ${post.title}` : null,
      post.subtitle ? `${post.subtitle}` : null,
      post.author?.name ? `By ${post.author.name}` : null,
      post.post_date ? `Published: ${post.post_date}` : null,
      "",
    ]
      .filter((x) => x !== null)
      .join("\n")

    const fullText = `${header}\n${bodyText}`

    return NextResponse.json({
      rawText: fullText,
      author: post.author?.name ?? "",
      title: post.title ?? "",
      canonicalUrl: post.canonical_url ?? url,
    })
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return errorResponse(504, "UPSTREAM_TIMEOUT", "Substack request timed out. Please try again.")
    }
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      err instanceof Error ? err.message : "Failed to fetch from Substack"
    )
  }
}
