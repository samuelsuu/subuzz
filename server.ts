import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer();

    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        path: "/socket.io",
        transports: ["websocket", "polling"]
    });

    httpServer.on("request", (req, res) => {
        if (!req.url?.startsWith("/socket.io")) {
            handler(req, res);
        }
    });

    // ── Presence tracking ──
    // Maps userId → Set of socketIds (a user can have multiple tabs)
    const onlineUsers = new Map<string, Set<string>>();

    // Authentication middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            console.log("❌ No token provided");
            return next(new Error("Authentication error: No token provided"));
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: { Authorization: `Bearer ${token}` }
                }
            }
        );

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.error("❌ Socket auth error:", error?.message);
            return next(new Error("Authentication error: Invalid token"));
        }

        socket.data.user = user;
        socket.data.token = token;
        console.log("✓ Socket authenticated:", user.email);
        next();
    });

    io.on("connection", (socket) => {
        const user = socket.data.user;
        console.log("✓ Client connected:", socket.id, user.email);

        // ── Presence: mark user online ──
        const userId: string = user.id;
        // Join personal notification room
        socket.join(`user_${userId}`);

        const wasOffline = !onlineUsers.has(userId) || onlineUsers.get(userId)!.size === 0;
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId)!.add(socket.id);

        if (wasOffline) {
            // Broadcast to all clients that this user came online
            io.emit("user_online", userId);
            console.log(`🟢 User ${userId} is now online`);
        }

        // Send current online users list to the newly connected client
        socket.emit("online_users_list", Array.from(onlineUsers.keys()));

        socket.on("get_online_users", () => {
            socket.emit("online_users_list", Array.from(onlineUsers.keys()));
        });

        socket.on("join_room", (roomId: string) => {
            if (roomId.startsWith("group_")) {
                socket.join(roomId);
                console.log(`✓ User ${user.id} joined group room ${roomId}`);
            } else {
                const ids = roomId.split("_");
                if (ids.includes(user.id)) {
                    socket.join(roomId);
                    console.log(`✓ User ${user.id} joined DM room ${roomId}`);
                }
            }
        });

        socket.on("private_message", async (data) => {
            const {
                roomId,
                message,
                messageType = 'text',
                attachmentUrl,
                attachmentName,
                attachmentSize,
                senderId,
                receiverId,
                groupId
            } = data;

            console.log("📨 Received message:", {
                type: messageType,
                content: message?.substring(0, 50),
                hasAttachment: !!attachmentUrl,
                senderId,
                receiverId,
                groupId
            });

            if (senderId !== user.id) {
                console.error("❌ User attempted to send message as someone else");
                return;
            }

            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    global: {
                        headers: { Authorization: `Bearer ${socket.data.token}` }
                    }
                }
            );

            // Build message object
            const messageData: Record<string, any> = {
                sender_id: senderId,
                message_type: messageType || 'text',
            };

            // Add content if present
            if (message) {
                messageData.content = message;
            }

            // Add attachment info if present
            if (attachmentUrl) {
                messageData.attachment_url = attachmentUrl;
                messageData.attachment_name = attachmentName || null;
                messageData.attachment_size = attachmentSize || null;
            }

            // Set target (DM or group) - REQUIRED
            if (groupId) {
                messageData.group_id = groupId;
                messageData.receiver_id = null; // Explicitly null for groups
            } else if (receiverId) {
                messageData.receiver_id = receiverId;
                messageData.group_id = null; // Explicitly null for DMs
            } else {
                console.error("❌ No receiver or group specified");
                socket.emit("message_error", { error: "No receiver or group specified" });
                return;
            }

            console.log("💾 Saving message to DB:", messageData);

            const { data: insertedData, error } = await supabase
                .from("messages")
                .insert(messageData)
                .select("*, sender:profiles!sender_id(*)")
                .single();

            if (error) {
                console.error("❌ Error persisting message:", error.message, error.details, error.hint);
                socket.emit("message_error", { error: error.message });
                return;
            }

            console.log("✓ Message saved:", insertedData.id);

            // Broadcast to room (for the chat window)
            io.to(roomId).emit("receive_message", insertedData);

            // ── Send notification to receiver's personal room ──
            if (receiverId) {
                // DM: notify the receiver
                io.to(`user_${receiverId}`).emit("new_notification", {
                    senderName: insertedData.sender?.username || "Someone",
                    content: message || (attachmentUrl ? "Sent an attachment" : "New message"),
                    senderId,
                    type: 'dm',
                });
            } else if (groupId) {
                // Group: notify all group members in the room except sender
                // We look up group members from the DB
                const adminSupabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );
                const { data: members } = await adminSupabase
                    .from("group_members")
                    .select("user_id")
                    .eq("group_id", groupId)
                    .neq("user_id", senderId);

                if (members) {
                    for (const member of members) {
                        io.to(`user_${member.user_id}`).emit("new_notification", {
                            senderName: insertedData.sender?.username || "Someone",
                            content: message || (attachmentUrl ? "Sent an attachment" : "New message"),
                            senderId,
                            groupName: data.groupName || "Group",
                            type: 'group',
                        });
                    }
                }
            }
        });

        socket.on("disconnect", () => {
            console.log("✗ Client disconnected:", socket.id);

            // ── Presence: mark user offline if no more sockets ──
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);
                    io.emit("user_offline", userId);
                    console.log(`🔴 User ${userId} is now offline`);
                }
            }
        });

        socket.on("delete_message", (data) => {
            const { roomId, messageId } = data;
            console.log(`🗑️ Message deleted: ${messageId} in room ${roomId}`);
            socket.to(roomId).emit("message_deleted", messageId);
        });
    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
            console.log(`> Socket.IO server listening`);
        });
});
