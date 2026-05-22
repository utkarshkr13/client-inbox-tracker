import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 max-w-md px-4">
        <h1 className="text-4xl font-bold text-gray-900">Client Inbox Tracker</h1>
        <p className="text-gray-500 text-lg">
          Track emails from clients per project. Mark each as done or pending — no more missed replies.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-in"
            className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
