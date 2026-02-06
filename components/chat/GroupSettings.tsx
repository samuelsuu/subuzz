import { useState, useRef, useEffect } from "react";
import { X, Camera, Users, Loader2, Plus, Check, Search } from "lucide-react";
import { getGroup, getGroupMembers, updateGroup, getUsers, addGroupMembers } from "@/app/chat/actions";
import { createClient } from "@/utils/supabase/client";
import type { Group, Profile } from "@/types/database";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { compressImage } from "@/utils/imageUtils";

interface GroupSettingsProps {
    groupId: string;
    currentUserId: string;
    onClose: () => void;
    onUpdate: (group: Group) => void;
}

export default function GroupSettings({ groupId, currentUserId, onClose, onUpdate }: GroupSettingsProps) {
    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
    const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [addingMembers, setAddingMembers] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();
    const isCreator = group?.created_by === currentUserId;

    useEffect(() => {
        const fetchData = async () => {
            const [groupData, membersData, allUsers] = await Promise.all([
                getGroup(groupId),
                getGroupMembers(groupId),
                getUsers()
            ]);

            if (groupData) {
                setGroup(groupData);
                setName(groupData.name);
                setDescription(groupData.description || "");
                if (groupData.avatar_url) {
                    setAvatarPreview(groupData.avatar_url);
                }
            }
            setMembers(membersData);
            setAvailableUsers(allUsers || []); // Ensure array if allUsers is undefined/null
            setLoading(false);
        };
        fetchData();
    }, [groupId]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Group name is required");
            return;
        }

        setSaving(true);

        let avatarUrl: string | undefined;

        // Upload new avatar if selected
        if (avatarFile) {
            const compressedAvatar = await compressImage(avatarFile);
            const path = `groups/${groupId}/${Date.now()}_${compressedAvatar.name}`;
            const { data, error } = await supabase.storage
                .from("chat-attachments")
                .upload(path, compressedAvatar);

            if (!error && data) {
                const { data: urlData } = supabase.storage
                    .from("chat-attachments")
                    .getPublicUrl(data.path);
                avatarUrl = urlData.publicUrl;
            }
        }

        const updates: { name?: string; description?: string; avatar_url?: string } = {};
        if (name !== group?.name) updates.name = name;
        if (description !== (group?.description || "")) updates.description = description;
        if (avatarUrl) updates.avatar_url = avatarUrl;

        if (Object.keys(updates).length === 0) {
            toast.success("No changes to save");
            setSaving(false);
            return;
        }

        const updatedGroup = await updateGroup(groupId, updates);

        if (updatedGroup) {
            toast.success("Group updated successfully!");
            onUpdate(updatedGroup);
            onClose();
        } else {
            toast.error("Failed to update group");
        }

        setSaving(false);
    };

    const handleAddMembers = async () => {
        if (selectedNewMembers.length === 0) return;
        setAddingMembers(true);

        const success = await addGroupMembers(groupId, selectedNewMembers);
        if (success) {
            toast.success("Members added successfully");
            // Refresh members list
            const updatedMembers = await getGroupMembers(groupId);
            setMembers(updatedMembers);
            setSelectedNewMembers([]);
            setSearchTerm("");
        } else {
            toast.error("Failed to add members");
        }
        setAddingMembers(false);
    };

    const toggleNewMember = (userId: string) => {
        setSelectedNewMembers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const nonMembers = availableUsers.filter(u =>
        !members.some(m => m.id === u.id) &&
        (u.username?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                    <span className="text-white">Loading group settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Group Settings</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isCreator ? (
                    <>
                        {/* Avatar Upload */}
                        <div className="flex items-center gap-4 mb-6">
                            <div
                                onClick={() => avatarInputRef.current?.click()}
                                className="relative h-20 w-20 rounded-full bg-purple-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                            >
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Group avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-8 h-8 text-white/70" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-medium">Group Avatar</p>
                                <p className="text-xs text-zinc-500">Click to change</p>
                            </div>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>

                        {/* Name Input */}
                        <div className="mb-4">
                            <label className="block text-sm text-zinc-400 mb-1">Group Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                        </div>

                        {/* Description Input */}
                        <div className="mb-6">
                            <label className="block text-sm text-zinc-400 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                            />
                        </div>
                    </>
                ) : (
                    <div className="mb-6 text-center">
                        <div className="h-20 w-20 rounded-full bg-purple-600 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                            {group?.avatar_url ? (
                                <img src={group.avatar_url} alt="Group avatar" className="w-full h-full object-cover" />
                            ) : (
                                <Users className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <h4 className="text-xl font-bold text-white">{group?.name}</h4>
                        {group?.description && (
                            <p className="text-zinc-400 text-sm mt-1">{group.description}</p>
                        )}
                    </div>
                )}

                {/* Members List */}
                <div className="mb-6">
                    <h4 className="text-sm text-zinc-400 mb-2">Members ({members.length})</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50">
                                <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-bold">
                                    {member.username?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <span className="text-white text-sm flex-1">{member.username}</span>
                                {member.id === group?.created_by && (
                                    <span className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded">Admin</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Members Section - Admins Only */}
                {isCreator && (
                    <div className="mb-6 border-t border-zinc-800 pt-6">
                        <h4 className="text-sm text-zinc-400 mb-3">Add Members</h4>

                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search users to add..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>

                        {selectedNewMembers.length > 0 && (
                            <button
                                onClick={handleAddMembers}
                                disabled={addingMembers}
                                className="w-full mb-3 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {addingMembers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add {selectedNewMembers.length} Selected
                            </button>
                        )}

                        <div className="max-h-40 overflow-y-auto space-y-2">
                            {nonMembers.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => toggleNewMember(user.id)}
                                    className={cn(
                                        "flex w-full items-center gap-3 p-2 rounded-lg transition-colors border border-transparent",
                                        selectedNewMembers.includes(user.id)
                                            ? "bg-emerald-900/30 border-emerald-500/50"
                                            : "hover:bg-zinc-800"
                                    )}
                                >
                                    <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">
                                        {user.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-white text-sm flex-1 text-left">{user.username}</span>
                                    {selectedNewMembers.includes(user.id) && (
                                        <Check className="w-4 h-4 text-emerald-400" />
                                    )}
                                </button>
                            ))}
                            {nonMembers.length === 0 && searchTerm && (
                                <p className="text-zinc-500 text-sm text-center py-2">No users found</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 px-4 text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        {isCreator ? "Cancel" : "Close"}
                    </button>
                    {isCreator && (
                        <button
                            onClick={handleSave}
                            disabled={saving || !name.trim()}
                            className="flex-1 py-2 px-4 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
