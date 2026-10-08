import { useCallback } from "react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";
import ChatThread from "../../components/ChatThread";

function toFormData(body, file) {
  const fd = new FormData();
  fd.append("body", body || "");
  fd.append("image", file);
  return fd;
}

export default function ParentMessages() {
  const fetchThread = useCallback(async () => {
    const { data } = await api.get("/messages/me");
    window.dispatchEvent(new Event("tc:messages-read")); // refresh the sidebar badge
    return data;
  }, []);

  const sendMessage = useCallback(async (body, file) => {
    // Photo -> multipart form; text only -> plain JSON like before
    const payload = file ? toFormData(body, file) : { body };
    const { data } = await api.post("/messages/me", payload);
    return data;
  }, []);

  const editMessage = useCallback(async (messageId, body) => {
    const { data } = await api.patch(`/messages/${messageId}`, { body });
    return data;
  }, []);

  const unsendMessage = useCallback(async (messageId) => {
    const { data } = await api.delete(`/messages/${messageId}`);
    return data;
  }, []);

  return (
    <DashboardLayout hideChatbot title="Messages" subtitle="Chat directly with your child's therapist">
      <div className="h-[calc(100dvh-8.5rem)] min-h-[540px]">
        <ChatThread
          role="parent"
          fetchThread={fetchThread}
          sendMessage={sendMessage}
          onEditMessage={editMessage}
          onUnsendMessage={unsendMessage}
          emptyLabel="No messages yet — say hello to your therapist."
        />
      </div>
    </DashboardLayout>
  );
}
