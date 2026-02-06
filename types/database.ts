// Database types for Subuzz Chat

export type Profile = {
    id: string;
    username: string | null;
    avatar_url: string | null;
    created_at: string;
};

export type Group = {
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    created_by: string;
    max_members: number;
    created_at: string;
};

export type GroupMember = {
    group_id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
};

export type MessageType = 'text' | 'image' | 'document' | 'voice';

export type Message = {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    group_id: string | null;
    content: string | null;
    message_type: MessageType;
    attachment_url: string | null;
    attachment_name: string | null;
    attachment_size: number | null;
    is_read: boolean;
    created_at: string;
    // Joined data
    sender?: Profile;
};

export type ChatTarget = {
    type: 'user' | 'group';
    id: string;
    name: string;
    avatar_url?: string | null;
};

// Constants
export const VOICE_NOTE_MAX_DURATION = 120; // seconds
export const GROUP_MAX_MEMBERS = 100;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
