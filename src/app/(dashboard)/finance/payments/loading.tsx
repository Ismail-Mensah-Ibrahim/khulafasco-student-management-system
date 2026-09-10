import { LoadingState } from "@/components/shared/LoadingState";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="skeleton h-4 w-72 rounded" />
      </div>
      <div className="rounded-xl border p-4 md:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton h-9 rounded-lg" />)}
        </div>
      </div>
      <LoadingState rows={6} cols={7} />
    </div>
  );
}
