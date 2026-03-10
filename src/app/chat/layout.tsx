import { Sidebar } from "./_components/sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
