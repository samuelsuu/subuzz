"use server";

import { createClient } from "@/utils/supabase/server";
import type { Profile, Group, Message } from "@/types/database";

export async function getUsers(): Promise<Profile[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id);

    if (error) {
        console.error(error);
        return [];
    }

    return data as Profile[];
}

export async function getCurrentProfile(): Promise<Profile | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error(error);
        return null;
    }

    return data as Profile;
}

export async function getMessages(otherUserId: string): Promise<Message[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("messages")
        .select("*, sender:profiles!sender_id(*)")
        .is("group_id", null)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        return [];
    }

    return data as Message[];
}

export async function getGroupMessages(groupId: string): Promise<Message[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("messages")
        .select("*, sender:profiles!sender_id(*)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        return [];
    }

    return data as Message[];
}

export async function getUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getGroups(): Promise<Group[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("group_members")
        .select("group:groups(*)")
        .eq("user_id", user.id);

    if (error) {
        console.error(error);
        return [];
    }

    return data.map((d: any) => d.group) as Group[];
}

export async function createGroup(
    name: string,
    memberIds: string[],
    description?: string,
    avatarUrl?: string
): Promise<Group | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Create group with optional description and avatar
    const groupData: Record<string, any> = {
        name,
        created_by: user.id
    };
    if (description) groupData.description = description;
    if (avatarUrl) groupData.avatar_url = avatarUrl;

    const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert(groupData)
        .select()
        .single();

    if (groupError) {
        console.error(groupError);
        return null;
    }

    // Add creator as admin
    const members = [
        { group_id: group.id, user_id: user.id, role: 'admin' },
        ...memberIds.map(id => ({ group_id: group.id, user_id: id, role: 'member' }))
    ];

    const { error: membersError } = await supabase
        .from("group_members")
        .insert(members);

    if (membersError) {
        console.error(membersError);
        // Rollback group creation
        await supabase.from("groups").delete().eq("id", group.id);
        return null;
    }

    return group as Group;
}

export async function getGroupMembers(groupId: string): Promise<Profile[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("group_members")
        .select("user:profiles(*)")
        .eq("group_id", groupId);

    if (error) {
        console.error(error);
        return [];
    }

    return data.map((d: any) => d.user) as Profile[];
}

export async function getGroup(groupId: string): Promise<Group | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

    if (error) {
        console.error(error);
        return null;
    }

    return data as Group;
}

export async function updateGroup(
    groupId: string,
    updates: { name?: string; description?: string; avatar_url?: string }
): Promise<Group | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Verify user is the creator
    const { data: group } = await supabase
        .from("groups")
        .select("created_by")
        .eq("id", groupId)
        .single();

    if (!group || group.created_by !== user.id) {
        console.error("Not authorized to edit this group");
        return null;
    }

    const { data, error } = await supabase
        .from("groups")
        .update(updates)
        .eq("id", groupId)
        .select()
        .single();

    if (error) {
        console.error(error);
        return null;
    }

    return data as Group;
}

export async function uploadAttachment(file: File, path: string): Promise<string | null> {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file);

    if (error) {
        console.error(error);
        return null;
    }

    const { data: urlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

export async function deleteMessage(messageId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", user.id);

    if (error) {
        console.error("Delete error:", error);
        return false;
    }

    return true;
}

export async function clearConversation(otherUserId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    // Delete messages sent by current user to this conversation
    const { error } = await supabase
        .from("messages")
        .delete()
        .eq("sender_id", user.id)
        .eq("receiver_id", otherUserId)
        .is("group_id", null);

    if (error) {
        console.error("Clear conversation error:", error);
        return false;
    }

    return true;
}

// ... existing code ...

export async function addGroupMembers(groupId: string, memberIds: string[]): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    // Check if user is admin (RLS policy handles this, but good for validation)
    const { data: membership } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single();

    if (!membership || membership.role !== 'admin') {
        console.error("Not authorized to add members");
        return false;
    }

    const newMembers = memberIds.map(id => ({
        group_id: groupId,
        user_id: id,
        role: 'member'
    }));

    const { error } = await supabase
        .from("group_members")
        .insert(newMembers);

    if (error) {
        console.error("Add members error:", error);
        return false;
    }

    return true;
}
// ... existing code ...

export async function updateProfile(updates: { avatar_url?: string }): Promise<Profile | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

    if (error) {
        console.error(error);
        return null;
    }

    return data as Profile;
}
