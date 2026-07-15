import { useCallback } from "react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import ChatThread from "../../components/ChatThread";

export default function ParentMessages() {
  const fetchThread = useCallback(async () => {
    const { data } = await api.get("/messages/me");
    return data;
  }, []);

  const sendMessage = useCallback(async (body) => {
    const { data } = await api.post("/messages/me", { body });
    return data;
  }, []);

  return (
    <DashboardLayout title="Messages" subtitle="Chat directly with your child's therapist">
      <div className="mx-auto max-w-2xl">
        <ChatThread
          role="parent"
          fetchThread={fetchThread}
          sendMessage={sendMessage}
          emptyLabel="No messages yet — say hello to your therapist."
        />
      </div>
    </DashboardLayout>
  );
}
