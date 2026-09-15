import { LoadingState } from "@/components/shared/LoadingState";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="skeleton h-8 w-56 rounded-lg" style={{ background: "var(--muted)" }} />
        <div className="skeleton h-4 w-96 rounded" style={{ background: "var(--muted)" }} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-xl border p-4"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
        ))}
      </div>

      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <LoadingState rows={5} cols={4} />
      </div>
    </div>
  );
}
