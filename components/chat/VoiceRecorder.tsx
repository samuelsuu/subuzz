"use client";

import { useRef, useState, useEffect } from "react";
import { Mic, Square, X, AlertCircle } from "lucide-react";
import { VOICE_NOTE_MAX_DURATION } from "@/types/database";

interface VoiceRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
    onCancel: () => void;
}

export default function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [isRequestingPermission, setIsRequestingPermission] = useState(true);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        requestPermissionAndStart();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const requestPermissionAndStart = async () => {
        setIsRequestingPermission(true);
        setPermissionError(null);

        try {
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setPermissionError("Your browser doesn't support audio recording");
                setIsRequestingPermission(false);
                return;
            }

            // Determine supported MIME type
            const mimeType = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg;codecs=opus',
                ''
            ].find(type => type === '' || MediaRecorder.isTypeSupported(type));

            // Request permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Permission granted, start recording
            const options = mimeType ? { mimeType } : undefined;
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const type = mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(1000); // Collect chunks every second
            setIsRecording(true);
            setIsRequestingPermission(false);

            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev >= VOICE_NOTE_MAX_DURATION - 1) {
                        stopRecording();
                        return VOICE_NOTE_MAX_DURATION;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err: any) {
            console.error("Failed to start recording:", err);
            setIsRequestingPermission(false);

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError("Microphone permission denied. Please allow access in your browser settings.");
            } else if (err.name === 'NotFoundError') {
                setPermissionError("No microphone found. Please connect a microphone.");
            } else {
                setPermissionError(`Could not access microphone: ${err.message}`);
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    const handleSend = () => {
        if (chunksRef.current.length > 0) {
            const type = mediaRecorderRef.current?.mimeType || 'audio/webm';
            const blob = new Blob(chunksRef.current, { type });
            onRecordingComplete(blob);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Show permission error
    if (permissionError) {
        return (
            <div className="flex items-center gap-3 bg-zinc-800 rounded-full px-4 py-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-sm flex-1">{permissionError}</span>
                <button
                    onClick={requestPermissionAndStart}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-full transition-colors"
                >
                    Retry
                </button>
                <button
                    onClick={onCancel}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    // Show loading while requesting permission
    if (isRequestingPermission) {
        return (
            <div className="flex items-center gap-3 bg-zinc-800 rounded-full px-4 py-2">
                <Mic className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span className="text-zinc-300 text-sm">Requesting microphone access...</span>
                <button
                    onClick={onCancel}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 bg-zinc-800 rounded-full px-4 py-2">
            {isRecording ? (
                <>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-400 text-sm font-mono">{formatTime(duration)}</span>
                        <span className="text-zinc-500 text-xs">/ {formatTime(VOICE_NOTE_MAX_DURATION)}</span>
                    </div>
                    <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-red-500 transition-all duration-1000"
                            style={{ width: `${(duration / VOICE_NOTE_MAX_DURATION) * 100}%` }}
                        />
                    </div>
                    <button
                        onClick={stopRecording}
                        className="p-2 bg-red-600 hover:bg-red-500 rounded-full transition-colors"
                    >
                        <Square className="w-4 h-4 text-white" />
                    </button>
                </>
            ) : audioUrl ? (
                <>
                    <audio src={audioUrl} controls className="h-8 flex-1" />
                    <button
                        onClick={handleSend}
                        className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-full transition-colors"
                    >
                        Send
                    </button>
                </>
            ) : null}
            <button
                onClick={onCancel}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
