import { LoadingState } from '@/components/shared/LoadingState';

export default function Loading() {
  return <LoadingState message="Loading students..." />;
}
import { LoadingState } from "@/components/shared/LoadingState";

export default function StudentsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-4 w-80 rounded" />
      </div>
      <div className="rounded-xl border p-4 md:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mb-4 grid gap-3 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
        <LoadingState rows={6} cols={6} />
      </div>
    </div>
  );
}
