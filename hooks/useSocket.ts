import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { createClient } from "@/utils/supabase/client";

type NotificationData = {
    senderName: string;
    content: string;
    senderId: string;
    groupName?: string;
    type: 'dm' | 'group';
};

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const notificationCallbackRef = useRef<((data: NotificationData) => void) | null>(null);
    const supabase = createClient();

    const setNotificationCallback = useCallback((cb: (data: NotificationData) => void) => {
        notificationCallbackRef.current = cb;
    }, []);

    useEffect(() => {
        const initSocket = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;

            const socketInstance = io({
                auth: {
                    token: session.access_token
                },
                path: "/socket.io",
                transports: ["websocket", "polling"],
            });

            socketInstance.on("connect", () => {
                console.log("Connected to socket");
                setIsConnected(true);
                socketInstance.emit("get_online_users");
            });

            socketInstance.on("disconnect", () => {
                console.log("Disconnected from socket");
                setIsConnected(false);
            });

            // ── Presence events ──
            socketInstance.on("online_users_list", (userIds: string[]) => {
                setOnlineUsers(new Set(userIds));
            });

            socketInstance.on("user_online", (userId: string) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    next.add(userId);
                    return next;
                });
            });

            socketInstance.on("user_offline", (userId: string) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                });
            });

            // ── Global notification event ──
            socketInstance.on("new_notification", (data: NotificationData) => {
                if (notificationCallbackRef.current) {
                    notificationCallbackRef.current(data);
                }
            });

            setSocket(socketInstance);
        };

        initSocket();

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    return { socket, isConnected, onlineUsers, setNotificationCallback };
};
