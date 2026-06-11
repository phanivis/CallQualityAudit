import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <LoginForm googleEnabled={googleEnabled()} />
    </main>
  );
}
