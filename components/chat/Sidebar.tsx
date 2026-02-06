"use client";

import { useEffect, useState, useRef } from "react";
import { getUsers, getGroups, getCurrentProfile, createGroup } from "@/app/chat/actions";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import { LogOut, Users, Plus, X, Check, MessageCircle, Camera, Search, Settings, Edit2 } from "lucide-react";
import type { Profile, Group } from "@/types/database";
import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { compressImage } from "@/utils/imageUtils";
import ProfileSettings from "./ProfileSettings";

interface SidebarProps {
    currentUser: User;
    onSelectChat: (target: { type: 'user' | 'group'; id: string; name: string }) => void;
    selectedId?: string;
    className?: string;
}

export default function Sidebar({ currentUser, onSelectChat, selectedId, className }: SidebarProps) {
    const [users, setUsers] = useState<Profile[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDescription, setNewGroupDescription] = useState("");
    const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
    const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');
    const [searchTerm, setSearchTerm] = useState("");
    const [showProfileSettings, setShowProfileSettings] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const filteredUsers = users.filter(u =>
        (u.username || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        Promise.all([getUsers(), getGroups(), getCurrentProfile()]).then(([usersData, groupsData, profileData]) => {
            setUsers(usersData);
            setGroups(groupsData);
            setProfile(profileData);
            setLoading(false);
        });
    }, []);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setGroupAvatarFile(file);
            setGroupAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || selectedMembers.length === 0) return;
        setCreatingGroup(true);

        let avatarUrl: string | undefined;

        // Upload avatar if selected
        if (groupAvatarFile) {
            const compressedAvatar = await compressImage(groupAvatarFile);
            const path = `groups/${Date.now()}_${compressedAvatar.name}`;
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

        const group = await createGroup(
            newGroupName,
            selectedMembers,
            newGroupDescription || undefined,
            avatarUrl
        );
        if (group) {
            setGroups([...groups, group]);
            setShowCreateGroup(false);
            setNewGroupName("");
            setNewGroupDescription("");
            setGroupAvatarFile(null);
            setGroupAvatarPreview(null);
            setSelectedMembers([]);
            toast.success(`Group "${group.name}" created successfully!`);
        } else {
            toast.error("Failed to create group. Please try again.");
        }
        setCreatingGroup(false);
    };

    const toggleMember = (id: string) => {
        setSelectedMembers(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    if (loading) {
        return (
            <div className={cn("p-4 text-center text-zinc-500 bg-zinc-900", className)}>
                <div className="animate-pulse">Loading...</div>
            </div>
        );
    }

    return (
        <>
            <div className={cn("flex flex-col border-r border-zinc-800 bg-zinc-900 h-full", className)}>
                {/* Header with username */}
                <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-emerald-900/20 to-zinc-900">
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold overflow-hidden">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.username || "User"} className="w-full h-full object-cover" />
                                ) : (
                                    profile?.username?.charAt(0).toUpperCase() || "?"
                                )}
                            </div>
                            <button
                                onClick={() => setShowProfileSettings(true)}
                                className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-1 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                            >
                                <div className="bg-emerald-600 rounded-full p-0.5">
                                    <Edit2 className="w-3 h-3 text-white" />
                                </div>
                            </button>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-white truncate">
                                {profile?.username || "User"}
                            </h2>
                            <p className="text-xs text-zinc-500 truncate">{currentUser.email}</p>
                        </div>
                    </div>
                </div>

                {showProfileSettings && profile && (
                    <ProfileSettings
                        profile={profile}
                        onClose={() => setShowProfileSettings(false)}
                        onUpdate={(updatedProfile) => {
                            setProfile(updatedProfile);
                        }}
                    />
                )}

                {/* Search */}
                <div className="p-4 border-b border-zinc-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-800 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800">
                    <button
                        onClick={() => setActiveTab('chats')}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                            activeTab === 'chats'
                                ? "text-emerald-400 border-b-2 border-emerald-400"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Chats
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                            activeTab === 'groups'
                                ? "text-emerald-400 border-b-2 border-emerald-400"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Users className="w-4 h-4" />
                        Groups
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'chats' ? (
                        filteredUsers.length === 0 ? (
                            <div className="p-4 text-center text-zinc-500 text-sm">No users found.</div>
                        ) : (
                            filteredUsers.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => onSelectChat({ type: 'user', id: user.id, name: user.username || 'Unknown' })}
                                    className={cn(
                                        "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-zinc-800/50",
                                        selectedId === user.id ? "bg-zinc-800" : ""
                                    )}
                                >
                                    <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold">
                                        {user.username?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">{user.username || "Unknown"}</p>
                                        <p className="text-xs text-zinc-500">Click to chat</p>
                                    </div>
                                </button>
                            ))
                        )
                    ) : (
                        <>
                            <button
                                onClick={() => setShowCreateGroup(true)}
                                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-zinc-800/50 border-b border-zinc-800"
                            >
                                <div className="h-10 w-10 rounded-full bg-emerald-600/20 border border-emerald-600/50 flex items-center justify-center">
                                    <Plus className="w-5 h-5 text-emerald-400" />
                                </div>
                                <p className="font-medium text-emerald-400">Create new group</p>
                            </button>
                            {filteredGroups.length === 0 ? (
                                <div className="p-4 text-center text-zinc-500 text-sm">No groups found.</div>
                            ) : (
                                filteredGroups.map((group) => (
                                    <button
                                        key={group.id}
                                        onClick={() => onSelectChat({ type: 'group', id: group.id, name: group.name })}
                                        className={cn(
                                            "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-zinc-800/50",
                                            selectedId === group.id ? "bg-zinc-800" : ""
                                        )}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                                            {group.avatar_url ? (
                                                <img src={group.avatar_url} alt={group.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Users className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-white truncate">{group.name}</p>
                                            <p className="text-xs text-zinc-500 truncate">{group.description || 'Group chat'}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </>
                    )}
                </div>

                {/* Logout */}
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
            </div >

            {/* Logout Confirmation Modal */}
            {
                showLogoutConfirm && (
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
                )
            }

            {/* Create Group Modal */}
            {
                showCreateGroup && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">Create Group</h3>
                                <button onClick={() => setShowCreateGroup(false)} className="text-zinc-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Group Avatar Upload */}
                            <div className="flex items-center gap-4 mb-4">
                                <div
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="relative h-16 w-16 rounded-full bg-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors overflow-hidden"
                                >
                                    {groupAvatarPreview ? (
                                        <img src={groupAvatarPreview} alt="Group avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-6 h-6 text-zinc-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-white">Group Avatar</p>
                                    <p className="text-xs text-zinc-500">Click to upload an image</p>
                                </div>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>

                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="Group name *"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />

                            <textarea
                                value={newGroupDescription}
                                onChange={(e) => setNewGroupDescription(e.target.value)}
                                placeholder="Group description (optional)"
                                rows={2}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                            />

                            <p className="text-sm text-zinc-400 mb-2">Select members (max 100)</p>
                            <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                                {users.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => toggleMember(user.id)}
                                        className={cn(
                                            "flex w-full items-center gap-3 p-2 rounded-lg transition-colors",
                                            selectedMembers.includes(user.id)
                                                ? "bg-emerald-600/20 border border-emerald-600/50"
                                                : "hover:bg-zinc-800"
                                        )}
                                    >
                                        <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-bold">
                                            {user.username?.charAt(0).toUpperCase() || "?"}
                                        </div>
                                        <span className="text-white flex-1 text-left">{user.username}</span>
                                        {selectedMembers.includes(user.id) && (
                                            <Check className="w-4 h-4 text-emerald-400" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleCreateGroup}
                                disabled={!newGroupName.trim() || selectedMembers.length === 0 || creatingGroup}
                                className="w-full py-2 px-4 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creatingGroup ? "Creating..." : `Create Group (${selectedMembers.length} members)`}
                            </button>
                        </div>
                    </div>
                )
            }
        </>
    );
}
