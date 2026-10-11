import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { retrySubstackEvent } from "@/services/substack-sync-service"
import { errorResponse } from "@/lib/api/errors"

const paramsSchema = z.object({ eventId: z.string().uuid() })

export async function POST(_request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse(401, "UNAUTHORIZED", "Authentication required")
  const params = paramsSchema.safeParse(await context.params)
  if (!params.success) return errorResponse(400, "VALIDATION_FAILED", "Invalid sync event")

  try {
    const processed = await retrySubstackEvent(createAdminClient(), user.id, params.data.eventId)
    return NextResponse.json({ processed })
  } catch (error) {
    return errorResponse(502, "UPSTREAM_ERROR", error instanceof Error ? error.message : "Retry failed")
  }
}
