"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Check, X, Loader2, ArrowLeft, MessageSquare, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [signupMode, setSignupMode] = useState(false);
    const [username, setUsername] = useState("");
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast.error(error.message || "Invalid credentials");
            setIsLoading(false);
            return;
        }

        toast.success("Login successful!");
        router.push("/chat");
        router.refresh();
    };

    const checkUsername = useCallback(async (val: string) => {
        if (!val || val.length < 3) {
            setUsernameStatus('idle');
            return;
        }

        setUsernameStatus('checking');
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .ilike('username', val)
            .single();

        if (error && error.code === 'PGRST116') {
            setUsernameStatus('available');
        } else if (data) {
            setUsernameStatus('taken');
        } else {
            setUsernameStatus('idle');
        }
    }, [supabase]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (signupMode) {
                checkUsername(username);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [username, signupMode, checkUsername]);

    const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (usernameStatus !== 'available') {
            toast.error("Please choose a unique available username");
            return;
        }

        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username },
            },
        });

        if (error) {
            toast.error(error.message);
            setIsLoading(false);
            return;
        }

        toast.success("Account created! Welcome to Subuzz.");
        router.push("/chat");
        router.refresh();
    };

    return (
        <div className="flex min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30">
            {/* Left Side - Visuals (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 overflow-hidden flex-col justify-between p-12">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors w-fit">
                        <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Subuzz</span>
                    </Link>
                </div>

                <div className="relative z-10 space-y-6 max-w-lg">
                    <h2 className="text-4xl font-bold leading-tight">
                        Experience the future of <span className="text-emerald-400">secure messaging</span>.
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-zinc-300">
                            <Zap className="w-5 h-5 text-emerald-500" />
                            <span>Real-time message delivery</span>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-300">
                            <Shield className="w-5 h-5 text-emerald-500" />
                            <span>Enterprise-grade security</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-sm text-zinc-500">
                    © {new Date().getFullYear()} Subuzz Inc.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative">
                {/* Mobile Back Button */}
                <Link href="/" className="absolute top-6 left-6 lg:hidden p-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                            {signupMode ? "Create an account" : "Welcome back"}
                        </h1>
                        <p className="text-zinc-400">
                            {signupMode ? "Enter your details to get started." : "Enter your credentials to access your account."}
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={signupMode ? handleSignup : handleLogin}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            {signupMode && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                                        Username <span className="text-zinc-500 text-xs ml-1">(Unique)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            name="username"
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className={cn(
                                                "w-full rounded-lg border bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 pr-10 transition-all",
                                                usernameStatus === 'available' ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500" :
                                                    usernameStatus === 'taken' ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" :
                                                        "border-zinc-800 focus:border-emerald-500 focus:ring-emerald-500"
                                            )}
                                            placeholder="username"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {usernameStatus === 'checking' && <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />}
                                            {usernameStatus === 'available' && <Check className="w-5 h-5 text-emerald-500" />}
                                            {usernameStatus === 'taken' && <X className="w-5 h-5 text-red-500" />}
                                        </div>
                                    </div>
                                    {usernameStatus === 'taken' && (
                                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                                            <X className="w-3 h-3" /> Username is already taken
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || (signupMode && usernameStatus !== 'available')}
                            className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                                </span>
                            ) : (
                                signupMode ? "Create Account" : "Sign In"
                            )}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-950 px-2 text-zinc-500">Or continue with</span>
                        </div>
                    </div>

                    <div className="text-center text-sm">
                        <span className="text-zinc-400">
                            {signupMode ? "Already have an account? " : "Don't have an account? "}
                        </span>
                        <button
                            onClick={() => {
                                setSignupMode(!signupMode);
                                setUsernameStatus('idle');
                                setUsername("");
                            }}
                            className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors hover:underline"
                        >
                            {signupMode ? "Sign in" : "Sign up"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
