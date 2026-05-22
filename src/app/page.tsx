import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await getSession();
  if (session.isLoggedIn) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 max-w-md px-4">
        <h1 className="text-4xl font-bold text-gray-900">Client Inbox Tracker</h1>
        <p className="text-gray-500 text-lg">
          Track emails from clients per project. Mark each as done or pending.
        </p>
        <Link
          href="/login"
          className="inline-block bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}
