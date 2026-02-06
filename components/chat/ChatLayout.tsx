"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import { User } from "@supabase/supabase-js";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

interface ChatLayoutProps {
    currentUser: User;
}

type ChatTarget = {
    type: 'user' | 'group';
    id: string;
    name: string;
};

export default function ChatLayout({ currentUser }: ChatLayoutProps) {
    const [selectedChat, setSelectedChat] = useState<ChatTarget | null>(null);
    const { socket, isConnected } = useSocket();

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    return (
        <div className="flex h-screen bg-zinc-950 overflow-hidden">
            {/* Sidebar - hidden on mobile if chat active */}
            <Sidebar
                currentUser={currentUser}
                onSelectChat={setSelectedChat}
                selectedId={selectedChat?.id}
                className={cn(
                    "w-full md:w-80 flex-shrink-0 z-10",
                    selectedChat ? "hidden md:flex" : "flex"
                )}
            />

            {/* Chat Area - hidden on mobile if no chat selected */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 bg-zinc-950",
                !selectedChat ? "hidden md:flex" : "flex"
            )}>
                {selectedChat ? (
                    <ChatWindow
                        currentUser={currentUser}
                        target={selectedChat}
                        socket={socket}
                        onBack={() => setSelectedChat(null)}
                        className="flex-1"
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                            <MessageSquare className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Welcome to Subuzz</h3>
                        <p className="text-center max-w-sm mb-8">
                            Select a conversation or create a group to start chatting securely.
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                            <span className={cn(
                                "w-2 h-2 rounded-full transition-colors",
                                isConnected ? "bg-emerald-500" : "bg-red-500"
                            )} />
                            <span>{isConnected ? "Connected to server" : "Connecting..."}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
