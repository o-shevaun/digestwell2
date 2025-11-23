import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}
export function isLocked(lockedAt?: string | Date) {
  if (!lockedAt) return false;
  const now = new Date();
  const lock = new Date(lockedAt);
  return now >= lock;
}
