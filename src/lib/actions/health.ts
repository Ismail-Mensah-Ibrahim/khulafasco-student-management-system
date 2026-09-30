"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface SystemHealthResult {
  isHealthy: boolean;
  timestamp: string;
  latencyMs: number;
  services: {
    auth: boolean;
    database: boolean;
    rpc: boolean;
    storage: boolean;
  };
  details: {
    databaseStatus: string;
    authStatus: string;
    rpcStatus: string;
    storageStatus: string;
  };
}

/**
 * Performs a live health-check against Supabase services.
 * Must only be called from protected server components/actions
 * (caller is responsible for authentication).
 */
export async function getSystemHealthStatus(): Promise<SystemHealthResult> {
  const startTime = Date.now();
  const supabase = await createClient();
  const adminClient = createAdminClient();

  let authOk = false;
  let dbOk = false;
  let rpcOk = false;
  let storageOk = false;

  let dbMsg = "OK";
  let authMsg = "OK";
  let rpcMsg = "OK";
  let storageMsg = "OK";

  // 1. Auth Check
  try {
    const { error } = await supabase.auth.getSession();
    if (!error) {
      authOk = true;
    } else {
      authMsg = error.message;
    }
  } catch (err: unknown) {
    authMsg = err instanceof Error ? err.message : "Auth service unreachable";
  }

  // 2. Database & Schema Tables Check
  try {
    const { error } = await supabase
      .from("school_settings")
      .select("school_name")
      .limit(1);

    if (!error) {
      dbOk = true;
    } else {
      dbMsg = error.message;
    }
  } catch (err: unknown) {
    dbMsg = err instanceof Error ? err.message : "Database connection error";
  }

  // 3. RPC Check — use get_pending_operations_summary since we just created it
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("get_pending_operations_summary");
    if (!error) {
      rpcOk = true;
    } else {
      rpcMsg = error.message;
    }
  } catch (err: unknown) {
    rpcMsg = err instanceof Error ? err.message : "RPC execution failure";
  }

  // 4. Storage Bucket Check
  try {
    const storageClient = adminClient ?? supabase;
    const { data, error } = await storageClient.storage.getBucket("student-photos");
    if (!error && data) {
      storageOk = true;
    } else {
      // Fallback check if getBucket metadata API call is restricted
      const { error: listErr } = await supabase.storage.from("student-photos").list("", { limit: 1 });
      if (!listErr) {
        storageOk = true;
        storageMsg = "OK";
      } else {
        storageMsg = error?.message ?? listErr?.message ?? "Bucket not found or permission issue";
      }
    }
  } catch (err: unknown) {
    storageMsg = err instanceof Error ? err.message : "Storage service check error";
  }

  const latencyMs = Date.now() - startTime;
  const isHealthy = dbOk && rpcOk && storageOk;

  return {
    isHealthy,
    timestamp: new Date().toISOString(),
    latencyMs,
    services: {
      auth: authOk,
      database: dbOk,
      rpc: rpcOk,
      storage: storageOk,
    },
    details: {
      databaseStatus: dbMsg,
      authStatus: authMsg,
      rpcStatus: rpcMsg,
      storageStatus: storageMsg,
    },
  };
}
