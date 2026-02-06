"use client";

import { useEffect, useState } from "react";
import { getUsers } from "@/app/chat/actions";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";

type Profile = {
    id: string;
    username: string;
};

interface UserListProps {
    currentUser: User;
    onSelectUser: (user: Profile) => void;
    selectedUserId?: string;
    className?: string;
}

export default function UserList({ currentUser, onSelectUser, selectedUserId, className }: UserListProps) {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        getUsers().then((data) => {
            setUsers(data as any as Profile[]);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className={cn("p-4 text-center text-zinc-500", className)}>
                Loading users...
            </div>
        )
    }

    return (
        <>
            <div className={cn("flex flex-col border-r border-zinc-800 bg-zinc-900", className)}>
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-xl font-bold text-white">Chats</h2>
                    <p className="text-xs text-zinc-500">Logged in as {currentUser.email}</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {users.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">No other users found.</div>
                    ) : (
                        users.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => onSelectUser(user)}
                                className={cn(
                                    "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-zinc-800/50",
                                    selectedUserId === user.id ? "bg-zinc-800" : ""
                                )}
                            >
                                <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold">
                                    {user.username?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <div>
                                    <p className="font-medium text-white">{user.username || "Unknown"}</p>
                                    <p className="text-xs text-zinc-500">Click to chat</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
                <div className="p-4 border-t border-zinc-800">
                    <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full py-2 px-4 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Log out
                    </button>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-2">Log out?</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            Are you sure you want to log out of your account?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-2 px-4 text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <form action={logout} className="flex-1">
                                <button
                                    type="submit"
                                    className="w-full py-2 px-4 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                                >
                                    Log out
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
