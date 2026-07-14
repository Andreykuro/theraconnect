import Sidebar from "./Sidebar";
import Chatbot from "./Chatbot";

export default function DashboardLayout({ title, subtitle, actions, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-chalk">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-mist-light bg-white px-8 py-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
            {subtitle && <p className="text-sm text-mist">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
      <Chatbot />
    </div>
  );
}
