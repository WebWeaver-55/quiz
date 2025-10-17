import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Users, Brain, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url(/placeholder.svg?height=1080&width=1920&query=abstract-tech-pattern-neural-network)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.3,
        }}
      />

      <div className="fixed inset-0 z-0 bg-gradient-to-br from-background via-background to-blue-950/20" />

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 md:px-12 py-6 glass-effect backdrop-blur-md border-b border-blue-500/20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">QuizAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-foreground hover:text-accent">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="px-6 md:px-12 py-20 md:py-32 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">Powered by Advanced AI</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="gradient-text">Transform Learning</span>
              <br />
              <span className="text-foreground">with Intelligent Quizzes</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Experience the future of education. AI-powered quizzes that adapt to your learning style, provide instant
              feedback, and help you master any subject.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 text-base h-12 px-8 glow-effect"
                >
                  Start Learning Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-blue-500/30 hover:bg-blue-500/10 text-base h-12 px-8 bg-transparent"
              >
                Watch Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 md:px-12 py-20 grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="glass-effect p-8 rounded-2xl border border-blue-500/20 hover:border-blue-500/40 transition-all hover:glow-effect">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-3">AI-Powered Learning</h3>
            <p className="text-muted-foreground">
              Adaptive quizzes that learn from your performance and adjust difficulty in real-time.
            </p>
          </div>

          <div className="glass-effect p-8 rounded-2xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all hover:glow-effect-cyan">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-3">Teacher & Student Roles</h3>
            <p className="text-muted-foreground">
              Create, manage, and track quizzes with powerful tools for educators and learners.
            </p>
          </div>

          <div className="glass-effect p-8 rounded-2xl border border-blue-500/20 hover:border-blue-500/40 transition-all hover:glow-effect">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Feedback</h3>
            <p className="text-muted-foreground">
              Get detailed explanations and insights immediately after completing each quiz.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 md:px-12 py-20 text-center">
          <div className="glass-effect p-12 rounded-3xl border border-blue-500/20 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to revolutionize your learning?</h2>
            <p className="text-muted-foreground mb-8">Join thousands of students and teachers already using QuizAI.</p>
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 text-base h-12 px-8 glow-effect"
              >
                Create Your Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-blue-500/20 px-6 md:px-12 py-8 text-center text-muted-foreground">
          <p>&copy; 2026 QuizAI. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
