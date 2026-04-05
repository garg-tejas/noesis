"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function LandingAuthNav() {
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setSignedIn(Boolean(user))
      setReady(true)
    })
  }, [])

  if (!ready) {
    return (
      <div className="h-10 w-48 rounded-md bg-muted/50 animate-pulse" aria-hidden />
    )
  }

  if (signedIn) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button className="bg-accent hover:bg-accent/90 text-white font-bold border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
            Open Workspace
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/auth/login"
        className="text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors px-4 py-2"
      >
        Sign in
      </Link>
      <Link href="/auth/sign-up">
        <Button className="bg-accent hover:bg-accent/90 text-white font-bold border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
          Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
  )
}
