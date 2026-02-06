import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { createClient } from "@/utils/supabase/client";

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const initSocket = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;

            // Custom server URL - implicitly relative to current origin if served from same domain,
            // but explicit for clarity if we were separating them. 
            // Here Next.js custom server serves both.
            const socketInstance = io({
                auth: {
                    token: session.access_token // Send Supabase JWT
                },
                path: "/socket.io",
                transports: ["websocket", "polling"], // Prefer WebSocket
            });

            socketInstance.on("connect", () => {
                console.log("Connected to socket");
                setIsConnected(true);
            });

            socketInstance.on("disconnect", () => {
                console.log("Disconnected from socket");
                setIsConnected(false);
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

    return { socket, isConnected };
};
