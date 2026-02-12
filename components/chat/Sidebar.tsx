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
    onSelectChat: (target: { type: 'user' | 'group'; id: string; name: string; avatar_url?: string | null }) => void;
    selectedId?: string;
    onlineUsers: Set<string>;
    className?: string;
}

export default function Sidebar({ currentUser, onSelectChat, selectedId, onlineUsers, className }: SidebarProps) {
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

        // Realtime subscription for profiles - REQUIRED for other users to see profile changes
        const channel = supabase
            .channel('public:profiles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setUsers(prev => [...prev, payload.new as Profile]);
                } else if (payload.eventType === 'UPDATE') {
                    setUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u));
                    if (currentUser && payload.new.id === currentUser.id) {
                        setProfile(payload.new as Profile);
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, supabase]);

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
        <div className={cn("flex flex-col border-r border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60 h-full", className)}>
            {/* Header with username */}
            <div className="p-4 border-b border-white/5 bg-transparent">
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold overflow-hidden ring-2 ring-zinc-900 transition-transform group-hover:scale-105">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.username || "User"} className="w-full h-full object-cover" />
                            ) : (
                                profile?.username?.charAt(0).toUpperCase() || "?"
                            )}
                        </div>
                        <button
                            onClick={() => setShowProfileSettings(true)}
                            className="absolute -bottom-1 -right-1 bg-zinc-800 rounded-full p-1.5 text-zinc-400 hover:text-white border border-zinc-700 transition-all hover:bg-emerald-600 hover:border-emerald-500 shadow-lg"
                        >
                            <Edit2 className="w-3 h-3 text-current" />
                        </button>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-white truncate leading-tight">
                            {profile?.username || "User"}
                        </h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-xs text-zinc-400 truncate">Online</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Log out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* showProfileSettings Modal */}
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
            <div className="px-4 py-3">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all placeholder-zinc-600"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 gap-2 mb-2">
                <button
                    onClick={() => setActiveTab('chats')}
                    className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2",
                        activeTab === 'chats'
                            ? "bg-zinc-800 text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                    )}
                >
                    <MessageCircle className="w-4 h-4" />
                    Chats
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2",
                        activeTab === 'groups'
                            ? "bg-zinc-800 text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                    )}
                >
                    <Users className="w-4 h-4" />
                    Groups
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {activeTab === 'chats' ? (
                    filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-zinc-500 text-sm gap-2">
                            <Users className="w-8 h-8 opacity-20" />
                            <p>No users found</p>
                        </div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div key={user.id} className="relative group">
                                <button
                                    onClick={() => onSelectChat({
                                        type: 'user',
                                        id: user.id,
                                        name: user.username || 'Unknown',
                                        avatar_url: user.avatar_url
                                    })}
                                    className={cn(
                                        "flex w-full items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-zinc-800/50",
                                        selectedId === user.id ? "bg-emerald-600/10 border border-emerald-600/20" : "border border-transparent"
                                    )}
                                >
                                    <div className="relative">
                                        <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold overflow-hidden ring-1 ring-white/5">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.username || "User"} className="w-full h-full object-cover" />
                                            ) : (
                                                user.username?.charAt(0).toUpperCase() || "?"
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className={cn("font-medium truncate transition-colors", selectedId === user.id ? "text-emerald-400" : "text-zinc-200 group-hover/btn:text-white")}>
                                                {user.username || "Unknown"}
                                            </p>
                                        </div>
                                        <p className="text-xs truncate mt-0.5 flex items-center gap-1">
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full shrink-0",
                                                onlineUsers.has(user.id) ? "bg-emerald-500" : "bg-zinc-600"
                                            )} />
                                            <span className={onlineUsers.has(user.id) ? "text-emerald-500" : "text-zinc-500"}>
                                                {onlineUsers.has(user.id) ? "Online" : "Offline"}
                                            </span>
                                        </p>
                                    </div>
                                </button>
                                {/* Mobile/Desktop Delete Action - Visible on hover or long press (handled via UI here for now as button) */}

                            </div>
                        ))
                    )
                ) : (
                    <>
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            className="flex w-full items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-emerald-600/10 border border-dashed border-zinc-800 hover:border-emerald-600/50 mb-2 group"
                        >
                            <div className="h-10 w-10 rounded-full bg-emerald-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5 text-emerald-400" />
                            </div>
                            <p className="font-medium text-emerald-400 group-hover:text-emerald-300">Create new group</p>
                        </button>
                        {filteredGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-zinc-500 text-sm gap-2">
                                <Users className="w-8 h-8 opacity-20" />
                                <p>No groups found</p>
                            </div>
                        ) : (
                            filteredGroups.map((group) => (
                                <button
                                    key={group.id}
                                    onClick={() => onSelectChat({ type: 'group', id: group.id, name: group.name })}
                                    className={cn(
                                        "flex w-full items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-zinc-800/50 group",
                                        selectedId === group.id ? "bg-purple-600/10 border border-purple-600/20" : "border border-transparent"
                                    )}
                                >
                                    <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold overflow-hidden ring-1 ring-white/5">
                                        {group.avatar_url ? (
                                            <img src={group.avatar_url} alt={group.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Users className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("font-medium truncate transition-colors", selectedId === group.id ? "text-purple-300" : "text-zinc-200 group-hover:text-white")}>
                                            {group.name}
                                        </p>
                                        <p className="text-xs text-zinc-500 truncate mt-0.5 group-hover:text-zinc-400">{group.description || 'Group chat'}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </>
                )}
            </div>

            {/* Logout Confirmation Modal */}
            {
                showLogoutConfirm && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold text-white mb-2">Log out?</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                Are you sure you want to log out of your account?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 py-2.5 px-4 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <form action={logout} className="flex-1">
                                    <button
                                        type="submit"
                                        className="w-full py-2.5 px-4 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors shadow-lg shadow-red-900/20"
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
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">Create Group</h3>
                                <button onClick={() => setShowCreateGroup(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Group Avatar Upload */}
                            <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                                <div
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="relative h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors overflow-hidden border-2 border-dashed border-zinc-700 hover:border-emerald-500"
                                >
                                    {groupAvatarPreview ? (
                                        <img src={groupAvatarPreview} alt="Group avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-6 h-6 text-zinc-500" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">Group Icon</p>
                                    <p className="text-xs text-zinc-500 mt-1">Tap to upload</p>
                                </div>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>

                            <div className="space-y-4 mb-6">
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Group name *"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-all"
                                />

                                <textarea
                                    value={newGroupDescription}
                                    onChange={(e) => setNewGroupDescription(e.target.value)}
                                    placeholder="Description (optional)"
                                    rows={2}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none transition-all"
                                />
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-col min-h-0 mb-6">
                                <p className="text-sm font-medium text-zinc-400 mb-3 flex items-center justify-between">
                                    <span>Select Members</span>
                                    <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full">{selectedMembers.length} selected</span>
                                </p>
                                <div className="overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 pr-1">
                                    {users.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => toggleMember(user.id)}
                                            className={cn(
                                                "flex w-full items-center gap-3 p-2.5 rounded-xl transition-all border",
                                                selectedMembers.includes(user.id)
                                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                                    : "bg-transparent border-transparent hover:bg-zinc-800"
                                            )}
                                        >
                                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-white text-sm font-bold ring-1 ring-white/5">
                                                {user.username?.charAt(0).toUpperCase() || "?"}
                                            </div>
                                            <span className={cn("flex-1 text-left text-sm", selectedMembers.includes(user.id) ? "text-emerald-400 font-medium" : "text-zinc-300")}>
                                                {user.username}
                                            </span>
                                            {selectedMembers.includes(user.id) && (
                                                <div className="bg-emerald-500 rounded-full p-0.5">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateGroup}
                                disabled={!newGroupName.trim() || selectedMembers.length === 0 || creatingGroup}
                                className="w-full py-3 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                {creatingGroup ? "Creating Group..." : "Create Group"}
                            </button>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

