import { ArrowRight, Sparkles, Search, GitCompareArrows, Zap, Shield, Brain, BookOpen, Lightbulb } from "lucide-react"
import dynamic from "next/dynamic"
import { BrainCircuitIcon } from "@/components/BrainCircuitIcon"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const LandingBelowFold = dynamic(() => import("@/components/landing/LandingBelowFold"), {
  loading: () => <div className="min-h-[40vh] bg-muted/20 animate-pulse" aria-hidden />,
})

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Neo-brutalist Navigation — signed-out shell only; proxy redirects authed users to /dashboard */}
      <nav className="border-b-4 border-foreground sticky top-0 z-50 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <BrainCircuitIcon className="w-8 h-8 text-primary" />
              <span className="font-display text-2xl font-bold tracking-tight">Noesis</span>
            </div>
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
          </div>
        </div>
      </nav>

      {/* Asymmetric Hero Section - Editorial Style */}
      <section className="relative overflow-hidden pt-16 pb-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 animate-slide-in-right">
              <div className="inline-block mb-6">
                <div className="px-4 py-2 bg-secondary/10 border-2 border-secondary font-mono text-xs font-bold text-secondary uppercase tracking-wider">
                  AI Knowledge Curation
                </div>
              </div>

              <h1 className="font-display text-6xl md:text-8xl font-bold mb-8 leading-[0.95] tracking-tight">
                Extract{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">Signal</span>
                  <span className="absolute bottom-2 left-0 w-full h-4 bg-primary/30 -rotate-1"></span>
                </span>
                <br />
                From Digital
                <br />
                <span className="text-primary">Noise</span>
              </h1>

              <p className="text-xl md:text-2xl text-foreground/70 mb-10 max-w-xl leading-relaxed font-medium">
                Transform tweets, articles, and videos into a{" "}
                <span className="text-primary font-bold">searchable curation layer</span> that surfaces what matters and
                flags tensions before they compound.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/auth/sign-up">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white font-bold text-lg px-8 py-7 h-auto border-2 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
                  >
                    Start Curating Free
                    <Sparkles className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 py-7 h-auto border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all"
                  >
                    Sign in
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-background border-2 border-foreground font-mono text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Zap className="w-4 h-4 inline mr-2 text-primary" />
                  AI-Powered
                </div>
                <div className="px-4 py-2 bg-background border-2 border-foreground font-mono text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Shield className="w-4 h-4 inline mr-2 text-secondary" />
                  100% Private
                </div>
                <div className="px-4 py-2 bg-background border-2 border-foreground font-mono text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Brain className="w-4 h-4 inline mr-2 text-accent" />
                  Contradiction Intelligence
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 animate-slide-in-bottom">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 blur-3xl opacity-60 animate-float"></div>

                <div className="relative space-y-4">
                  <div className="bg-card border-4 border-foreground p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform rotate-2">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-primary flex items-center justify-center border-2 border-foreground font-display font-bold text-2xl">
                        87
                      </div>
                      <div className="px-3 py-1 bg-secondary text-white font-mono text-xs font-bold border-2 border-foreground">
                        CURATED
                      </div>
                    </div>
                    <h4 className="font-display font-bold text-lg mb-2">Quality-Scored Knowledge</h4>
                    <p className="text-sm text-foreground/70">Every entry gets an AI quality score. Focus on signal, ignore noise.</p>
                  </div>

                  <div className="bg-card border-4 border-foreground p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                    <div className="flex items-center gap-2 mb-3">
                      <GitCompareArrows className="w-5 h-5 text-accent" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider">Tension Detected</span>
                    </div>
                    <p className="text-sm text-foreground/80 font-medium">AI detects conflicting ideas across your knowledge base automatically.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-1/4 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>
      </section>

      <LandingBelowFold />
    </div>
  )
}
