import Link from "next/link";
import { MessageSquare, Shield, Zap, Users, Lock, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Subuzz</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Log in
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium px-5 py-2.5 bg-white text-zinc-950 rounded-full hover:bg-emerald-50 transition-all transform hover:scale-105 shadow-lg shadow-white/10"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-32 pb-16 px-6">
        <div className="container mx-auto flex flex-col items-center text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            v2.0 is now live
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Chat <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Instantly.</span>
            <br />
            Connect <span className="text-zinc-500">Securely.</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Experience the next generation of messaging. Real-time delivery, end-to-end like security, and a beautiful interface designed for modern teams.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link
              href="/login"
              className="px-8 py-4 bg-emerald-600 text-white rounded-full font-semibold hover:bg-emerald-500 transition-all transform hover:scale-105 shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              Start Chatting <MessageSquare className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              className="px-8 py-4 bg-zinc-900 text-zinc-300 rounded-full font-semibold hover:bg-zinc-800 transition-all border border-zinc-800 flex items-center justify-center gap-2"
            >
              View Source <Globe className="w-4 h-4" />
            </a>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-yellow-400" />}
              title="Lightning Fast"
              description="Powered by WebSocket technology for instant message delivery and real-time typing indicators."
            />
            <FeatureCard
              icon={<Lock className="w-6 h-6 text-emerald-400" />}
              title="Secure by Design"
              description="Built with Row Level Security (RLS) to ensure your private conversations stay private."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6 text-purple-400" />}
              title="Group Chats"
              description="Create communities, share files, and collaborate with unlimited members in real-time."
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-900 bg-zinc-950">
        <div className="container mx-auto px-6 text-center text-zinc-600 text-sm">
          <p>&copy; {new Date().getFullYear()} Subuzz. Built with Next.js & Supabase.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-emerald-500/20 transition-colors text-left group">
      <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="font-bold text-lg text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
