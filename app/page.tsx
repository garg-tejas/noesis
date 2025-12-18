"use client"

import { ArrowRight, Sparkles, Search, GitCompareArrows, Zap, Shield, Brain, Quote, CheckCircle2, MessageSquareText } from "lucide-react"
import { BrainCircuitIcon } from "@/components/BrainCircuitIcon"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        router.push("/dashboard")
      } else {
        setIsChecking(false)
      }
    }
    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB]">
        <div className="text-center">
          <BrainCircuitIcon className="w-12 h-12 text-brand-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Coming online...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Subtle background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Navigation */}
      <nav className="border-b border-gray-200/50 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5 text-brand-600 font-bold text-xl tracking-tight">
              <BrainCircuitIcon className="w-7 h-7" />
              <span>Noesis</span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/auth/login"
                className="text-sm font-semibold text-gray-600 hover:text-brand-600 transition-colors"
              >
                Sign in
              </Link>
              <Link href="/auth/sign-up">
                <Button className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 rounded-full shadow-md shadow-brand-100 transition-all hover:scale-105 active:scale-95">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center">
            {/* Personality Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Sparkles className="w-3.5 h-3.5" />
              The Signal In The Noise
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-gray-900 mb-8 tracking-tight leading-[0.95] animate-in fade-in slide-in-from-bottom-6 duration-1000">
              Stop bookmarking.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">
                Start understanding.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              Noesis is your personal intelligence layer. We distill the chaos of the web into clear, actionable logic that actually sticks.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-6 justify-center items-center mb-20 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="bg-brand-600 hover:bg-brand-700 text-white text-lg px-10 py-7 h-auto rounded-full shadow-xl shadow-brand-200 hover:shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0"
                >
                  Join the Waitlist
                  <Sparkles className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <div className="text-sm font-medium text-gray-400">
                No credit card. No fluff. Just signal.
              </div>
            </div>

            {/* Visual Teaser: The "Distillation" Effect */}
            <div className="relative max-w-4xl mx-auto mt-12 group animate-in zoom-in-95 duration-1000 delay-500">
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-100 to-brand-50 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
                <div className="flex-1 p-8 text-left bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  <div className="space-y-3 opacity-40 italic font-mono text-sm leading-relaxed">
                    <p>"Just spent 4 hours reading about RLHF and how reward models interact with policy gradients in sparse environments. Basically, you need to ensure the KL divergence doesn't explode while maintaining the exploration-exploitation balance..."</p>
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse delay-75" />
                    <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse delay-150" />
                  </div>
                </div>
                <div className="flex-1 p-8 text-left relative bg-white">
                  <div className="absolute top-4 right-4 text-brand-600">
                    <Sparkles className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <h4 className="text-brand-600 font-bold text-xs uppercase tracking-widest mb-4">Distilled Intelligence</h4>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-gray-800">Reward models define the objective boundary.</p>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-gray-800">Policy collapse happens when KL constraints fail.</p>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex gap-2">
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded uppercase">AI</span>
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded uppercase">Learning</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(2,132,199,0.15)_0,transparent_70%)]" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <Quote className="w-12 h-12 text-brand-500 mb-6 opacity-50" />
              <h2 className="text-4xl sm:text-5xl font-extrabold mb-8 leading-tight">
                "Knowledge is not just gathering data. It's the ability to act on it."
              </h2>
              <p className="text-xl text-gray-400 font-medium">
                We're drowning in information but starving for wisdom. Noesis was built to fix that—by helping you extract the 1% that actually matters.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-brand-400 font-black text-3xl mb-1">99%</div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Web Noise</div>
              </div>
              <div className="p-6 rounded-2xl bg-brand-600 border border-brand-400/30">
                <div className="text-white font-black text-3xl mb-1">1%</div>
                <div className="text-brand-100 text-xs font-bold uppercase tracking-wider">The Signal</div>
              </div>
              <div className="col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-white font-black text-xl mb-2">Built for high-agency readers.</div>
                <p className="text-sm text-gray-500">For those who value their attention as their most precious resource.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">Your Second Brain, Evolved.</h2>
            <p className="text-lg text-gray-500 font-medium max-w-xl mx-auto">
              Everything you need to turn content into a competitive advantage.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 auto-rows-[300px]">
            {/* Feature 1: Large Bento */}
            <div className="md:col-span-2 rounded-3xl bg-[#F8F9FB] border border-gray-200 p-10 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-10 transition-transform group-hover:scale-110 duration-500 opacity-10">
                <BrainCircuitIcon className="w-64 h-64 text-brand-600" />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-200">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4">Deep Distillation</h3>
                <p className="text-gray-600 text-lg max-w-md font-medium">
                  Our LLM engine doesn't just summarize. It extracts core logic, context, and creates a scoreboard of actionable insights.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">Auto-Tagging</div>
                <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">Quality Scoring</div>
              </div>
            </div>

            {/* Feature 2: Small Bento */}
            <div className="rounded-3xl bg-brand-50 border border-brand-100 p-10 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mb-6 border border-brand-200 group-hover:bg-brand-200 transition-colors">
                  <GitCompareArrows className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="text-2xl font-black text-brand-900 mb-2 leading-none">Contradiction Maps</h3>
                <p className="text-brand-700/70 text-sm font-medium">
                  We cross-reference your knowledge base to find where ideas clash.
                </p>
              </div>
              <div className="h-1 bg-brand-200 w-full rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 w-2/3 group-hover:w-full transition-all duration-1000" />
              </div>
            </div>

            {/* Feature 3: Small Bento */}
            <div className="rounded-3xl bg-gray-900 p-10 flex flex-col justify-between text-white group">
              <div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                  <Search className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="text-2xl font-black mb-2 leading-none italic">Instant Retrieval</h3>
                <p className="text-gray-400 text-sm font-medium">
                  Search by concept, not keywords. Your memory, searchable.
                </p>
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-900 flex items-center justify-center text-[10px] font-bold">
                    {i}
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 4: Medium Bento */}
            <div className="md:col-span-2 rounded-3xl bg-[#F8F9FB] border border-gray-200 p-10 flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                  <MessageSquareText className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-4">Personal Annotations</h3>
                <p className="text-gray-600 text-sm font-medium">
                  Add your own thoughts alongside distilled insights. Noesis merges AI intelligence with your personal reflection.
                </p>
              </div>
              <div className="flex-1 w-full bg-white border border-gray-200 rounded-2xl p-4 shadow-inner">
                <div className="h-3 w-1/3 bg-gray-100 rounded mb-2" />
                <div className="h-3 w-2/3 bg-brand-50 rounded mb-4" />
                <div className="h-20 w-full bg-gray-50 rounded border border-dashed border-gray-200" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-[#F8F9FB] relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-brand-100 rounded-full blur-3xl opacity-30" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-8 tracking-tighter italic">
            Knowledge is a choice.<br />
            Make the better one.
          </h2>
          <p className="text-xl text-gray-500 mb-12 max-w-xl mx-auto font-medium">
            Join the community of readers who are taking their attention back from the algorithm.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="bg-brand-600 hover:bg-brand-700 text-white text-lg px-12 py-8 h-auto rounded-full shadow-2xl shadow-brand-200 transition-all hover:scale-105"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 bg-white py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2.5 text-brand-600 font-bold text-2xl tracking-tighter">
              <BrainCircuitIcon className="w-8 h-8" />
              <span>Noesis</span>
            </div>
            <p className="text-sm font-medium text-gray-400">
              Noesis. Made for knowledge seekers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
