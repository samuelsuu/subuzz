"use client";

import { X, Download } from "lucide-react";
import { useEffect } from "react";

interface ImageModalProps {
    imageUrl: string;
    fileName?: string;
    onClose: () => void;
}

export default function ImageModal({ imageUrl, fileName, onClose }: ImageModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const handleDownload = async () => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName || `image-${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(imageUrl, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-in fade-in duration-200">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="relative max-w-[90vw] max-h-[90vh]">
                <img
                    src={imageUrl}
                    alt={fileName || "Full screen image"}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg"
                />

                <div className="absolute bottom-4 right-4 flex gap-2">
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors"
                    >
                        <Download className="w-5 h-5" />
                        <span>Download</span>
                    </button>
                </div>
            </div>

            {/* Backdrop click to close */}
            <div
                className="absolute inset-0 -z-10"
                onClick={onClose}
            />
        </div>
    );
}
