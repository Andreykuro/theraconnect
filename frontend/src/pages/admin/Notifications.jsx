import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { MessageSquare, Mail } from "lucide-react";
import api from "../../lib/api";
import DashboardLayout from "../../components/DashboardLayout";

const STATUS_STYLE = {
  sent: "bg-harbor-light text-harbor-dark",
  simulated: "bg-mist-light text-mist",
  failed: "bg-coral-red-light text-coral-red",
};

export default function Notifications() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notifications").then(({ data }) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout
      title="Notification log"
      subtitle="Every SMS reminder and email sent to guardians"
    >
      <div className="mb-4 rounded-xl border border-dashed border-mist-light bg-white/60 p-4 text-sm text-mist">
        Entries marked <span className="stamp font-semibold text-mist">SIMULATED</span> mean no SMS/email
        provider key is configured yet in the backend .env — the message was logged instead of dispatched.
        Add a Semaphore or SMTP key to send for real.
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-light">
        <table className="w-full text-left text-sm">
          <thead className="bg-chalk text-xs uppercase tracking-wide text-mist">
            <tr>
              <th className="px-4 py-3 font-semibold">Channel</th>
              <th className="px-4 py-3 font-semibold">Recipient</th>
              <th className="px-4 py-3 font-semibold">Message</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-light">
            {!loading && logs.map((l) => (
              <tr key={l.id} className="hover:bg-chalk">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-mist">
                    {l.channel === "sms" ? <MessageSquare size={14} /> : <Mail size={14} />}
                    {l.channel.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink">{l.recipient}</td>
                <td className="max-w-md truncate px-4 py-3 text-mist">{l.message}</td>
                <td className="px-4 py-3">
                  <span className={`stamp rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[l.status] || STATUS_STYLE.simulated}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-mist">
                  {format(parseISO(l.created_at.replace(" ", "T")), "MMM d, h:mm a")}
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-mist">
                  Nothing sent yet. Schedule a session to trigger a reminder.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
