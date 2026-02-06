"use client";

import { FileText, Download, Play, Pause, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, MessageType } from "@/types/database";
import { useState, useRef, useEffect } from "react";
import ImageModal from "./ImageModal";

interface MessageBubbleProps {
    message: Message;
    isMe: boolean;
    onDelete?: (messageId: string) => void;
}

export default function MessageBubble({ message, isMe, onDelete }: MessageBubbleProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showMenu, setShowMenu] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString("en-US", {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showMenu]);

    const togglePlayback = async () => {
        if (!audioRef.current) return;

        try {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                await audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        } catch (error) {
            console.error("Audio playback error:", error);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const prog = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setProgress(prog || 0);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(message.id);
        }
        setShowMenu(false);
    };

    const renderContent = () => {
        switch (message.message_type) {
            case 'image':
                return (
                    <>
                        <div
                            className="cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setShowImageModal(true)}
                        >
                            <img
                                src={message.attachment_url || ''}
                                alt="Shared image"
                                className="w-full h-auto rounded-lg max-h-[300px] object-cover"
                                crossOrigin="anonymous"
                            />
                        </div>
                        {message.content && (
                            <p className="mt-2 text-sm">{message.content}</p>
                        )}
                        {showImageModal && (
                            <ImageModal
                                imageUrl={message.attachment_url || ''}
                                fileName={message.attachment_name || 'image.jpg'}
                                onClose={() => setShowImageModal(false)}
                            />
                        )}
                    </>
                );

            case 'document':
                return (
                    <a
                        href={message.attachment_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-colors",
                            isMe ? "bg-emerald-700/50 hover:bg-emerald-700/70" : "bg-zinc-700/50 hover:bg-zinc-700/70"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            isMe ? "bg-emerald-600" : "bg-zinc-600"
                        )}>
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{message.attachment_name || 'Document'}</p>
                            <p className="text-xs opacity-70">{formatFileSize(message.attachment_size)}</p>
                        </div>
                        <Download className="w-4 h-4 opacity-70" />
                    </a>
                );

            case 'voice':
                return (
                    <div className="flex items-center gap-3 min-w-[200px]">
                        <button
                            onClick={togglePlayback}
                            className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                isMe ? "bg-emerald-700 hover:bg-emerald-600" : "bg-zinc-600 hover:bg-zinc-500"
                            )}
                        >
                            {isPlaying ? (
                                <Pause className="w-4 h-4 text-white" />
                            ) : (
                                <Play className="w-4 h-4 text-white ml-0.5" />
                            )}
                        </button>
                        <div className="flex-1">
                            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white/60 transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <audio
                            ref={audioRef}
                            src={message.attachment_url || ''}
                            onEnded={() => { setIsPlaying(false); setProgress(0); }}
                            onTimeUpdate={handleTimeUpdate}
                            preload="metadata"
                            crossOrigin="anonymous"
                        />
                    </div>
                );

            default:
                return <p>{message.content}</p>;
        }
    };

    return (
        <div
            className={cn(
                "flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-200 group relative",
                isMe ? "justify-end" : "justify-start"
            )}
        >
            {!isMe && (
                <div className="flex-shrink-0 mr-2 self-end mb-1">
                    <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {message.sender?.avatar_url ? (
                            <img src={message.sender.avatar_url} alt={message.sender.username || "?"} className="w-full h-full object-cover" />
                        ) : (
                            (message.sender?.username || "?").charAt(0).toUpperCase()
                        )}
                    </div>
                </div>
            )}

            <div className={cn("max-w-[75%] flex flex-col", isMe ? "items-end" : "items-start")}>
                {!isMe && (
                    <span className="text-xs text-zinc-400 ml-1 mb-1">
                        {message.sender?.username || "Unknown"}
                    </span>
                )}
                <div
                    className={cn(
                        "relative px-4 py-2 shadow-sm rounded-2xl",
                        isMe
                            ? "bg-emerald-600 text-white rounded-br-none"
                            : "bg-zinc-800 text-zinc-100 rounded-bl-none border border-zinc-700"
                    )}
                >
                    {/* Delete button (only for me) */}
                    {isMe && onDelete && (
                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-full shadow-lg transition-colors border border-zinc-700"
                                title="Delete message"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Delete confirmation dropdown */}
                    {showMenu && (
                        <div ref={menuRef} className="absolute left-0 top-0 -translate-x-full -translate-y-1/2 mr-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 p-2">
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 rounded-md whitespace-nowrap"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete message
                            </button>
                        </div>
                    )}

                    {renderContent()}
                    <p className={cn(
                        "text-[10px] mt-1 opacity-70",
                        isMe ? "text-emerald-100" : "text-zinc-500"
                    )}>
                        {formatTime(message.created_at)}
                    </p>
                </div>
            </div>
        </div>
    );
}
