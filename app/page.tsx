import Link from "next/link";
import { MessageSquare, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white">
      <header className="px-6 py-4 flex items-center justify-between border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Subuzz</span>
        </div>
        <nav className="flex gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-emerald-500 transition-colors">
            Log in
          </Link>
          <Link href="/login" className="text-sm font-medium px-4 py-2 bg-white text-zinc-950 rounded-full hover:bg-zinc-200 transition-colors">
            Sign up
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center mt-[-4rem]">
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent pb-2">
          Chat Instantly.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl">
          A secure, realtime 1-on-1 messaging platform built for speed and privacy.
        </p>

        <div className="mt-10 flex gap-4">
          <Link href="/login" className="px-8 py-3 bg-emerald-600 rounded-full font-semibold hover:bg-emerald-500 transition-all transform hover:scale-105">
            Start Chatting
          </Link>
          <a href="https://github.com/supabase/supabase" target="_blank" className="px-8 py-3 bg-zinc-800 rounded-full font-semibold hover:bg-zinc-700 transition-all">
            View on GitHub
          </a>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col items-center">
            <Zap className="w-10 h-10 text-emerald-500 mb-4" />
            <h3 className="font-bold text-lg">Realtime</h3>
            <p className="text-zinc-400 text-sm mt-2">Powered by Socket.IO for instant delivery.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col items-center">
            <Shield className="w-10 h-10 text-emerald-500 mb-4" />
            <h3 className="font-bold text-lg">Secure</h3>
            <p className="text-zinc-400 text-sm mt-2">RLS policies ensure your DMs stay private.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col items-center">
            <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 rounded-full text-emerald-500 font-bold mb-4">PG</div>
            <h3 className="font-bold text-lg">Persistent</h3>
            <p className="text-zinc-400 text-sm mt-2">All history saved in Supabase PostgreSQL.</p>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-zinc-600 text-sm">
        Built with Next.js & Supabase
      </footer>
    </div>
  );
}
