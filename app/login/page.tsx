"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/utils/supabase/client";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
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
            // No result found = available
            setUsernameStatus('available');
        } else if (data) {
            // Result found = taken
            setUsernameStatus('taken');
        } else {
            // Other error
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
        // username is already in state

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
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-white">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-emerald-400">Subuzz Chat</h1>
                    <p className="mt-2 text-zinc-400">Realtime Secure Messaging</p>
                </div>

                <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
                    <form className="space-y-4" onSubmit={signupMode ? handleSignup : handleLogin}>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300">
                                Email
                            </label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300">
                                Password
                            </label>
                            <input
                                name="password"
                                type="password"
                                required
                                className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                placeholder="••••••••"
                            />
                        </div>

                        {signupMode && (
                            <div>
                                <label className="block text-sm font-medium text-zinc-300">
                                    Username <span className="text-zinc-500">(Unique)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        name="username"
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className={cn(
                                            "mt-1 block w-full rounded-md border bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 pr-10",
                                            usernameStatus === 'available' ? "border-emerald-500 focus:ring-emerald-500" :
                                                usernameStatus === 'taken' ? "border-red-500 focus:ring-red-500" :
                                                    "border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500"
                                        )}
                                        placeholder="clean_coder"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-[calc(50%-2px)]">
                                        {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />}
                                        {usernameStatus === 'available' && <Check className="w-4 h-4 text-emerald-500" />}
                                        {usernameStatus === 'taken' && <X className="w-4 h-4 text-red-500" />}
                                    </div>
                                </div>
                                {usernameStatus === 'taken' && (
                                    <p className="mt-1 text-xs text-red-400">Username is already taken</p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            {!signupMode ? (
                                <>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
                                    >
                                        {isLoading ? "..." : "Log in"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSignupMode(true)}
                                        disabled={isLoading}
                                        className="flex-1 rounded-md bg-zinc-700 py-2 text-sm font-semibold text-white hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
                                    >
                                        Sign up
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setSignupMode(false)}
                                        disabled={isLoading}
                                        className="flex-1 rounded-md bg-zinc-700 py-2 text-sm font-semibold text-white hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
                                    >
                                        Back to Login
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || usernameStatus !== 'available'}
                                        className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? "..." : "Create Account"}
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
