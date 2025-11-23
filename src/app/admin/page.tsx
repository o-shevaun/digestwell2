import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") return <div>Admins only.</div>;
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-gray-600">Future: user management, analytics, content curation.</p>
    </div>
  );
}
