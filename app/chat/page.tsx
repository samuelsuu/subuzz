import { redirect } from "next/navigation";
import { getUser } from "./actions";
import ChatLayout from "@/components/chat/ChatLayout";

export default async function ChatPage() {
    const user = await getUser();

    if (!user) {
        redirect("/login");
    }

    return <ChatLayout currentUser={user} />;
}
