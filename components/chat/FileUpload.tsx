"use client";

import { useRef } from "react";
import { Paperclip, Image, FileText, X } from "lucide-react";
import { ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES, MAX_FILE_SIZE } from "@/types/database";
import toast from "react-hot-toast";

interface FileUploadProps {
    onFileSelect: (file: File, type: 'image' | 'document') => void;
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            toast.error("File too large. Max size is 10MB.");
            return;
        }

        const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES;
        if (!allowedTypes.includes(file.type)) {
            toast.error(`Invalid file type for ${type}.`);
            return;
        }

        onFileSelect(file, type);
        e.target.value = ''; // Reset input
    };

    return (
        <div className="flex items-center gap-1">
            <input
                ref={imageInputRef}
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                onChange={(e) => handleFileChange(e, 'image')}
                className="hidden"
            />
            <input
                ref={docInputRef}
                type="file"
                accept={ALLOWED_DOCUMENT_TYPES.join(',')}
                onChange={(e) => handleFileChange(e, 'document')}
                className="hidden"
            />

            <button
                onClick={() => imageInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
                title="Send image"
            >
                <Image className="w-5 h-5" />
            </button>

            <button
                onClick={() => docInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
                title="Send document"
            >
                <FileText className="w-5 h-5" />
            </button>
        </div>
    );
}
