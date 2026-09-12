import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  className?: string;
}

/**
 * Responsive data table with horizontal scroll on small screens.
 * On mobile (< sm), each row renders as a stacked card.
 */
export function DataTable<T>({
  columns,
  data,
  keyField,
  emptyMessage = "No data found.",
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div
        className={cn("rounded-xl flex items-center justify-center py-16", className)}
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl overflow-hidden", className)}
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em]",
                    col.headerClassName
                  )}
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={String(row[keyField])}
                style={{
                  background: "var(--surface)",
                  borderBottom: i < data.length - 1 ? "1px solid var(--border)" : undefined,
                }}
                className="transition-colors hover:bg-[var(--muted)] align-top"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 align-top", col.className)}
                    style={{ color: "var(--foreground)" }}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="sm:hidden divide-y" style={{ borderColor: "var(--border)" }}>
        {data.map((row) => (
          <div
            key={String(row[keyField])}
            className="p-4 space-y-2"
            style={{ background: "var(--surface)" }}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between items-start gap-2">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide flex-shrink-0"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {col.header}
                </span>
                <span className="text-sm text-right" style={{ color: "var(--foreground)" }}>
                  {col.cell(row)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
