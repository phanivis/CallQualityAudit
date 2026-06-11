import { redirect } from "next/navigation";
import { auth } from "@/auth";
import HistoryView from "./HistoryView";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="min-h-screen bg-gray-50">
      <HistoryView
        userEmail={session.user.email ?? session.user.name ?? "user"}
      />
    </main>
  );
}
