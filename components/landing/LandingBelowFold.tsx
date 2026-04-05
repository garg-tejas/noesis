import { ArrowRight, Sparkles, Search, GitCompareArrows, BookOpen, Lightbulb, Zap, Brain } from "lucide-react"
import { BrainCircuitIcon } from "@/components/BrainCircuitIcon"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LandingBelowFold() {
  return (
    <>
      <section className="py-24 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <div className="inline-block mb-4">
              <div className="px-3 py-1 bg-foreground text-background font-mono text-xs font-bold uppercase tracking-wider">
                Features
              </div>
            </div>
            <h2 className="font-display text-5xl md:text-6xl font-bold mb-6 max-w-3xl">
              Everything you need to <span className="text-primary">think clearly</span>
            </h2>
            <p className="text-xl text-foreground/70 max-w-2xl font-medium">
              Built for people who read a lot and want to remember what matters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="md:row-span-2 bg-card border-4 border-foreground p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <div className="w-16 h-16 bg-primary border-2 border-foreground flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-4">AI Distillation Engine</h3>
              <p className="text-foreground/70 leading-relaxed mb-6">
                Paste any tweet thread, blog post, or YouTube video. Our AI curates:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Core ideas and key concepts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Actionable insights and takeaways</span>
                </li>
                <li className="flex items-start gap-2">
                  <Brain className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Smart tags and quality scores (0-100)</span>
                </li>
              </ul>
            </div>

            <div className="bg-secondary text-white border-4 border-foreground p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <Search className="w-12 h-12 mb-4" />
              <h3 className="font-display text-xl font-bold mb-3">Powerful Search</h3>
              <p className="text-white/90 text-sm leading-relaxed">
                Full-text search across all entries. Filter by tags, quality score, or source type. Your knowledge, instantly accessible.
              </p>
            </div>

            <div className="bg-card border-4 border-foreground p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <GitCompareArrows className="w-12 h-12 text-accent mb-4" />
              <h3 className="font-display text-xl font-bold mb-3">Contradiction Detection</h3>
              <p className="text-foreground/70 text-sm leading-relaxed">
                AI identifies conflicting claims across your curated knowledge so you can resolve inconsistencies early.
              </p>
            </div>

            <div className="bg-primary text-white border-4 border-foreground p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <BookOpen className="w-12 h-12 mb-4" />
              <h3 className="font-display text-xl font-bold mb-3">Personal Notes</h3>
              <p className="text-white/90 text-sm leading-relaxed">
                Add your own thoughts and reflections to any entry. Build connections between ideas and develop your own insights.
              </p>
            </div>

            <div className="bg-card border-4 border-foreground p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
              <div className="font-mono text-4xl font-bold text-accent mb-4">0-100</div>
              <h3 className="font-display text-xl font-bold mb-3">Quality Filtering</h3>
              <p className="text-foreground/70 text-sm leading-relaxed">
                Every entry gets a quality score. Set your threshold and filter out the noise. Only keep what&apos;s worth keeping.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-display text-5xl md:text-6xl font-bold mb-6">
              Simple. Powerful. <span className="text-secondary">Yours.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-24 h-24 bg-primary border-4 border-foreground text-white rounded-none flex items-center justify-center font-display text-4xl font-bold mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
                1
              </div>
              <h3 className="font-display text-2xl font-bold mb-3">Paste Content</h3>
              <p className="text-foreground/70 text-lg">Drop in tweets, articles, or YouTube URLs. No fuss.</p>
            </div>

            <div className="text-center group">
              <div className="w-24 h-24 bg-secondary border-4 border-foreground text-white rounded-none flex items-center justify-center font-display text-4xl font-bold mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
                2
              </div>
              <h3 className="font-display text-2xl font-bold mb-3">AI Distills</h3>
              <p className="text-foreground/70 text-lg">Curate core ideas, actionables, tags, and quality scores automatically.</p>
            </div>

            <div className="text-center group">
              <div className="w-24 h-24 bg-accent border-4 border-foreground text-white rounded-none flex items-center justify-center font-display text-4xl font-bold mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
                3
              </div>
              <h3 className="font-display text-2xl font-bold mb-3">Stress-Test Knowledge</h3>
              <p className="text-foreground/70 text-lg">Search, filter, annotate, and detect contradictions in one workflow.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 lg:px-8 bg-foreground text-background">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <BrainCircuitIcon className="w-20 h-20 text-primary mx-auto animate-float" />
          </div>
          <h2 className="font-display text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Stop drowning in bookmarks.
            <br />
            <span className="text-primary">Start thinking clearly.</span>
          </h2>
          <p className="text-xl md:text-2xl text-background/80 mb-12 max-w-2xl mx-auto font-medium">
            Join builders and learners creating rigorous personal knowledge systems with Noesis.
          </p>
          <Link href="/auth/sign-up">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xl px-12 py-8 h-auto border-4 border-background shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] transition-all active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
            >
              Start Curating Free
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
          </Link>
          <p className="mt-6 text-sm text-background/60 font-mono">No credit card required. Free forever.</p>
        </div>
      </section>

      <footer className="border-t-4 border-foreground py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <BrainCircuitIcon className="w-7 h-7 text-primary" />
              <span className="font-display text-xl font-bold">Noesis</span>
            </div>
            <p className="text-sm text-foreground/60 font-mono">
              Made for serious learners. Built with care.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
