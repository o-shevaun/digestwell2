"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Guard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  if (status === "loading") return <div>Loading...</div>;
  if (!session?.user) return <div className="p-4 border rounded-2xl">
    Please <Link className="text-primary" href="/login">login</Link>.
  </div>;
  return <>{children}</>;
}
