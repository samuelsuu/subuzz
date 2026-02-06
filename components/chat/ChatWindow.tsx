"use client";

import { useEffect, useRef, useState } from "react";
import { getMessages, getGroupMessages, deleteMessage, clearConversation, getGroup } from "@/app/chat/actions";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import type { Socket } from "socket.io-client";
import { Send, Mic, ArrowLeft, Trash2, Settings, Smile } from "lucide-react";
import type { Message, Group } from "@/types/database";
import MessageBubble from "./MessageBubble";
import FileUpload from "./FileUpload";
import VoiceRecorder from "./VoiceRecorder";
import GroupSettings from "./GroupSettings";
import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { compressImage } from "@/utils/imageUtils";

interface ChatWindowProps {
    currentUser: User;
    target: { type: 'user' | 'group'; id: string; name: string };
    socket: Socket | null;
    onBack?: () => void;
    className?: string;
}

export default function ChatWindow({ currentUser, target, socket, onBack, className }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const roomId = target.type === 'user'
        ? [currentUser.id, target.id].sort().join("_")
        : `group_${target.id}`;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        setLoading(true);
        const fetchMessages = target.type === 'user'
            ? getMessages(target.id)
            : getGroupMessages(target.id);

        if (target.type === 'group') {
            getGroup(target.id).then(g => setCurrentGroup(g));
        } else {
            setCurrentGroup(null);
        }

        fetchMessages.then((data) => {
            setMessages(data);
            setLoading(false);
            setTimeout(scrollToBottom, 100);
        });
    }, [target.id, target.type]);

    useEffect(() => {
        if (!socket) return;

        socket.emit("join_room", roomId);

        const handleReceiveMessage = (message: Message) => {
            setMessages((prev) => [...prev, message]);
            setTimeout(scrollToBottom, 100);

            // Browser notification if not from me
            if (message.sender_id !== currentUser.id && Notification.permission === 'granted') {
                new Notification('New message', {
                    body: message.content || 'Sent an attachment',
                    icon: '/favicon.ico'
                });
            }
        };

        const handleMessageDeleted = (messageId: string) => {
            setMessages((prev) => prev.filter(m => m.id !== messageId));
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("message_deleted", handleMessageDeleted);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("message_deleted", handleMessageDeleted);
        };
    }, [socket, roomId, currentUser.id]);

    const uploadFile = async (file: File): Promise<{ url: string; name: string; size: number } | null> => {
        const path = `${currentUser.id}/${Date.now()}_${file.name}`;

        const { data, error } = await supabase.storage
            .from("chat-attachments")
            .upload(path, file);

        if (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload file");
            return null;
        }

        const { data: urlData } = supabase.storage
            .from("chat-attachments")
            .getPublicUrl(data.path);

        return { url: urlData.publicUrl, name: file.name, size: file.size };
    };

    const sendMessage = async (
        content: string | null,
        messageType: 'text' | 'image' | 'document' | 'voice' = 'text',
        attachmentUrl?: string,
        attachmentName?: string,
        attachmentSize?: number
    ) => {
        if (!socket) return;

        const messageData = {
            roomId,
            message: content,
            messageType,
            attachmentUrl,
            attachmentName,
            attachmentSize,
            senderId: currentUser.id,
            receiverId: target.type === 'user' ? target.id : null,
            groupId: target.type === 'group' ? target.id : null,
        };

        socket.emit("private_message", messageData);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || isSending) return;

        const content = newMessage;
        setNewMessage("");
        await sendMessage(content, 'text');
    };

    const handleFileSelect = async (file: File, type: 'image' | 'document') => {
        setIsSending(true);
        let fileToUpload = file;

        if (type === 'image') {
            fileToUpload = await compressImage(file);
        }

        const uploadResult = await uploadFile(fileToUpload);
        if (uploadResult) {
            await sendMessage(null, type, uploadResult.url, uploadResult.name, uploadResult.size);
        }
        setIsSending(false);
    };

    const handleVoiceComplete = async (blob: Blob) => {
        setIsRecording(false);
        setIsSending(true);

        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        const uploadResult = await uploadFile(file);
        if (uploadResult) {
            await sendMessage(null, 'voice', uploadResult.url, uploadResult.name, uploadResult.size);
        }
        setIsSending(false);
    };

    const handleDeleteMessage = async (messageId: string) => {
        const success = await deleteMessage(messageId);
        if (success) {
            setMessages((prev) => prev.filter(m => m.id !== messageId));
            socket?.emit("delete_message", { roomId, messageId });
            toast.success("Message deleted");
        } else {
            toast.error("Failed to delete message");
        }
    };

    const handleClearConversation = async () => {
        if (target.type !== 'user') return;
        if (!confirm("Delete all YOUR messages in this conversation? This cannot be undone.")) return;

        const success = await clearConversation(target.id);
        if (success) {
            setMessages((prev) => prev.filter(m => m.sender_id !== currentUser.id));
            toast.success("Your messages cleared");
        } else {
            toast.error("Failed to clear messages");
        }
    };


    if (loading) {
        return (
            <div className={cn("flex-1 flex items-center justify-center text-zinc-500", className)}>
                <div className="animate-pulse">Loading chat...</div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full bg-zinc-950", className)}>
            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                {onBack && (
                    <button onClick={onBack} className="md:hidden p-2 mr-2 text-zinc-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-white font-bold mr-3 overflow-hidden",
                    target.type === 'group' ? "bg-purple-600" : "bg-emerald-600"
                )}>
                    {target.type === 'group' && currentGroup?.avatar_url ? (
                        <img src={currentGroup.avatar_url} alt={currentGroup.name} className="w-full h-full object-cover" />
                    ) : (
                        (currentGroup?.name || target.name).charAt(0).toUpperCase()
                    )}
                </div>
                <div className="flex-1">
                    <h2 className="font-bold text-white">{currentGroup?.name || target.name}</h2>
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-500 font-medium">
                            {target.type === 'group' ? 'Group chat' : 'Online'}
                        </span>
                    </div>
                </div>
                {/* Clear conversation button - DMs only */}
                {target.type === 'user' && (
                    <button
                        onClick={handleClearConversation}
                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-full transition-colors"
                        title="Clear your messages"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}

                {/* Group Settings button - Groups only */}
                {target.type === 'group' && (
                    <button
                        onClick={() => setShowGroupSettings(true)}
                        className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
                        title="Group Info & Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Group Settings Modal */}
            {showGroupSettings && target.type === 'group' && (
                <GroupSettings
                    groupId={target.id}
                    currentUserId={currentUser.id}
                    onClose={() => setShowGroupSettings(false)}
                    onUpdate={(updatedGroup) => {
                        setCurrentGroup(updatedGroup);
                        // Ideally notify parent to update sidebar, but local state update handles header for now
                        // We are forced to reload page to reflect in sidebar or lift state
                    }}
                />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-zinc-500 py-8">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isMe={msg.sender_id === currentUser.id}
                            onDelete={handleDeleteMessage}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                {isRecording ? (
                    <VoiceRecorder
                        onRecordingComplete={handleVoiceComplete}
                        onCancel={() => setIsRecording(false)}
                    />
                ) : (
                    <div className="relative">
                        {showEmojiPicker && (
                            <div className="absolute bottom-full mb-2 left-0 z-50 shadow-xl rounded-lg overflow-hidden">
                                <EmojiPicker
                                    theme={Theme.DARK}
                                    onEmojiClick={(emojiData) => {
                                        setNewMessage(prev => prev + emojiData.emoji);
                                        setShowEmojiPicker(false);
                                    }}
                                />
                                <div
                                    className="fixed inset-0 z-[-1]"
                                    onClick={() => setShowEmojiPicker(false)}
                                />
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <FileUpload onFileSelect={handleFileSelect} />

                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2 text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 rounded-full transition-colors"
                                title="Add emoji"
                            >
                                <Smile className="w-5 h-5" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsRecording(true)}
                                className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
                                title="Record voice note"
                            >
                                <Mic className="w-5 h-5" />
                            </button>

                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                disabled={isSending}
                                className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent disabled:opacity-50"
                            />

                            <button
                                type="submit"
                                disabled={!newMessage.trim() || isSending}
                                className="bg-emerald-600 text-white rounded-full p-2 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
