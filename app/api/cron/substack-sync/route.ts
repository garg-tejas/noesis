import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncSubstackIntegration } from "@/services/substack-sync-service"
import { errorResponse } from "@/lib/api/errors"
import { createRouteLogger } from "@/lib/api/server-log"

export async function GET(request: NextRequest) {
  const log = createRouteLogger("/api/cron/substack-sync")
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return errorResponse(401, "UNAUTHORIZED", "Invalid cron authorization")
  }

  try {
    const admin = createAdminClient()
    const { data: integrations, error } = await admin
      .from("substack_integrations")
      .select("id, user_id, encrypted_session, remote_user_id, sync_likes, sync_saves")
      .eq("status", "active")
    if (error) throw error

    const results = []
    for (const integration of integrations || []) {
      try {
        results.push({ integrationId: integration.id, ...(await syncSubstackIntegration(admin, integration)) })
      } catch (error) {
        results.push({ integrationId: integration.id, error: error instanceof Error ? error.message : "Sync failed" })
      }
    }
    log.info("cron.completed", { integrationCount: results.length })
    return NextResponse.json({ results })
  } catch (error) {
    log.error("cron.failed", error)
    return errorResponse(500, "INTERNAL_ERROR", error instanceof Error ? error.message : "Scheduled sync failed")
  }
}
