import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AuditApp from "@/components/AuditApp";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="min-h-screen bg-gray-50">
      <AuditApp userLabel={session.user.email ?? session.user.name ?? "Signed in"} />
    </main>
  );
}
