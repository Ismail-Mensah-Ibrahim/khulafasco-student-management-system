import { LoadingState } from "@/components/shared/LoadingState";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="skeleton h-4 w-64 rounded" />
      </div>
      <div className="rounded-xl border p-4 md:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <LoadingState rows={3} cols={2} />
      </div>
    </div>
  );
}