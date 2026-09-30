"use client";

import { Activity, CheckCircle, Database, HardDrive, Key, Server, AlertCircle } from "lucide-react";
import { SystemHealthResult } from "@/lib/actions/health";

interface Props {
  health: SystemHealthResult;
}

export function SystemHealthWidget({ health }: Props) {
  return (
    <div
      className="rounded-xl p-5 border shadow-xs space-y-4"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: health.isHealthy ? "var(--success-light)" : "var(--destructive-light)",
              color: health.isHealthy ? "var(--success)" : "var(--destructive)",
            }}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              Supabase Infrastructure Health
            </h3>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Live production backend diagnostics ({health.latencyMs}ms)
            </p>
          </div>
        </div>

        <span
          className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
          style={{
            background: health.isHealthy ? "var(--success-light)" : "var(--destructive-light)",
            color: health.isHealthy ? "var(--success)" : "var(--destructive)",
          }}
        >
          {health.isHealthy ? "Operational" : "Degraded"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <HealthItem
          label="Database (PostgreSQL)"
          icon={Database}
          ok={health.services.database}
          detail={health.details.databaseStatus}
        />
        <HealthItem
          label="Supabase Auth"
          icon={Key}
          ok={health.services.auth}
          detail={health.details.authStatus}
        />
        <HealthItem
          label="RPC Functions"
          icon={Server}
          ok={health.services.rpc}
          detail={health.details.rpcStatus}
        />
        <HealthItem
          label="Storage Buckets"
          icon={HardDrive}
          ok={health.services.storage}
          detail={health.details.storageStatus}
        />
      </div>
    </div>
  );
}

function HealthItem({
  label,
  icon: Icon,
  ok,
  detail,
}: {
  label: string;
  icon: React.ElementType;
  ok: boolean;
  detail: string;
}) {
  return (
    <div
      className="p-3 rounded-lg border flex flex-col justify-between"
      style={{
        borderColor: "var(--border)",
        background: "var(--background)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
        {ok ? (
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-rose-500" />
        )}
      </div>
      <div>
        <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
          {label}
        </p>
        <p className="text-[11px] truncate" style={{ color: ok ? "var(--muted-foreground)" : "var(--destructive)" }}>
          {ok ? "Healthy" : detail}
        </p>
      </div>
    </div>
  );
}
