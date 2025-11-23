"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();
  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          DigestWell
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="hover:text-primary">
            Dashboard
          </Link>

          {/* 🔗 New profile link */}
          <Link href="/profile" className="hover:text-primary">
            Profile
          </Link>

          <Link href="/mealplans" className="hover:text-primary">
            Calendar
          </Link>
          <Link href="/chat" className="hover:text-primary">
            Chat
          </Link>

          {!session?.user ? (
            <>
              <Link
                href="/login"
                className="px-3 py-1 rounded border border-primary text-primary"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-3 py-1 rounded bg-primary text-white"
              >
                Register
              </Link>
            </>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-3 py-1 rounded border"
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
