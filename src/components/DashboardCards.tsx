export default function DashboardCards({ stats }: { stats: { plans: number; accepted: number } }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="p-4 rounded-2xl shadow border">
        <div className="text-sm text-gray-500">Total Plans</div>
        <div className="text-3xl font-semibold">{stats.plans}</div>
      </div>
      <div className="p-4 rounded-2xl shadow border">
        <div className="text-sm text-gray-500">Accepted</div>
        <div className="text-3xl font-semibold">{stats.accepted}</div>
      </div>
    </div>
  );
}
