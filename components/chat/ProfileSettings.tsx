"use client";

import { useState, useRef } from "react";
import { X, Camera, Loader2 } from "lucide-react";
import { updateProfile } from "@/app/chat/actions";
import { createClient } from "@/utils/supabase/client";
import type { Profile } from "@/types/database";
import toast from "react-hot-toast";
import { compressImage } from "@/utils/imageUtils";

interface ProfileSettingsProps {
    profile: Profile;
    onClose: () => void;
    onUpdate: (profile: Profile) => void;
}

export default function ProfileSettings({ profile, onClose, onUpdate }: ProfileSettingsProps) {
    const [saving, setSaving] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        let avatarUrl = profile.avatar_url;

        // Upload new avatar if selected
        if (avatarFile) {
            const compressedAvatar = await compressImage(avatarFile);
            const path = `profiles/${profile.id}/${Date.now()}_${compressedAvatar.name}`;
            const { data, error } = await supabase.storage
                .from("chat-attachments")
                .upload(path, compressedAvatar);

            if (!error && data) {
                const { data: urlData } = supabase.storage
                    .from("chat-attachments")
                    .getPublicUrl(data.path);
                avatarUrl = urlData.publicUrl;
            } else {
                toast.error("Failed to upload avatar");
                setSaving(false);
                return;
            }
        }

        if (avatarUrl === profile.avatar_url && !avatarFile) {
            toast.success("No changes to save");
            setSaving(false);
            return;
        }

        const updatedProfile = await updateProfile({ avatar_url: avatarUrl || undefined });

        if (updatedProfile) {
            toast.success("Profile updated successfully!");
            onUpdate(updatedProfile);
            onClose();
        } else {
            toast.error("Failed to update profile");
        }

        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Edit Profile</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col items-center mb-8">
                    <div
                        onClick={() => avatarInputRef.current?.click()}
                        className="relative h-24 w-24 rounded-full bg-emerald-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden mb-3"
                    >
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl font-bold text-white">
                                {profile.username?.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <p className="text-white font-medium text-lg">@{profile.username}</p>
                    <p className="text-xs text-zinc-500">Click avatar to change</p>
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 px-4 text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2 px-4 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
