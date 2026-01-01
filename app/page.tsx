"use client"

import { ArrowRight, Sparkles, Search, GitCompareArrows, Zap, Shield, Brain } from "lucide-react"
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
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-brand-600 font-bold text-lg">
              <BrainCircuitIcon className="w-6 h-6" />
              <span>Noesis</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link href="/auth/sign-up">
                <Button className="bg-brand-600 hover:bg-brand-700 text-white">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-100 rounded-full blur-3xl opacity-50 animate-pulse" />
                <BrainCircuitIcon className="w-24 h-24 text-brand-600 relative z-10" />
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
              Transform tweets and blogs into
              <br />
              <span className="text-brand-600">distilled insights</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Your personal knowledge distiller. Extract signal from noise, build a searchable knowledge base, and
              discover contradictions in your reading.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="bg-brand-600 hover:bg-brand-700 text-white text-lg px-8 py-6 h-auto shadow-lg shadow-brand-200 hover:shadow-xl transition-all"
                >
                  Start Distilling
                  <Sparkles className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 h-auto border-2 border-gray-300 hover:border-gray-400"
                >
                  Sign in
                </Button>
              </Link>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-16">
              <div className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                <Zap className="w-4 h-4 inline mr-2 text-brand-600" />
                AI-Powered
              </div>
              <div className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                <Shield className="w-4 h-4 inline mr-2 text-brand-600" />
                Private & Secure
              </div>
              <div className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                <Brain className="w-4 h-4 inline mr-2 text-brand-600" />
                Smart Organization
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Build your second brain with powerful features designed for knowledge seekers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-xl border border-gray-200 bg-[#F8F9FB] hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Distillation</h3>
              <p className="text-gray-600 leading-relaxed">
                Paste any tweet thread or blog post. AI extracts core ideas, actionable insights, and key takeaways
                automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-xl border border-gray-200 bg-[#F8F9FB] hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Powerful Search</h3>
              <p className="text-gray-600 leading-relaxed">
                Full-text search across all your knowledge. Filter by quality score, tags, or source type. Find what
                matters instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-xl border border-gray-200 bg-[#F8F9FB] hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                <GitCompareArrows className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Contradiction Detection</h3>
              <p className="text-gray-600 leading-relaxed">
                Automatically find conflicting ideas across your knowledge base. Refine your mental models and discover
                deeper insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F8F9FB]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Simple, powerful, and designed for you</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Add Content</h3>
              <p className="text-gray-600">Paste tweets, blog posts, or any text. No scraping, no complexity.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-brand-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI Distills</h3>
              <p className="text-gray-600">
                Our AI extracts core ideas, removes fluff, and generates actionable insights with quality scores.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-brand-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Build Knowledge</h3>
              <p className="text-gray-600">
                Search, filter, organize. Add notes. Find contradictions. Build your personal knowledge base.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <BrainCircuitIcon className="w-16 h-16 text-brand-600 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Ready to build your knowledge base?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join knowledge seekers who are transforming how they consume and retain information.
          </p>
          <Link href="/auth/sign-up">
            <Button
              size="lg"
              className="bg-brand-600 hover:bg-brand-700 text-white text-lg px-8 py-6 h-auto shadow-lg shadow-brand-200 hover:shadow-xl transition-all"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 text-brand-600 font-bold text-lg mb-4 md:mb-0">
              <BrainCircuitIcon className="w-5 h-5" />
              <span>Noesis</span>
            </div>
            <p className="text-sm text-gray-500">Noesis. Made for knowledge seekers.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
