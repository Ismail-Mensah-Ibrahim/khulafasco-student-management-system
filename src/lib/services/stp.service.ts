/**
 * WAEC STP Readiness Service
 * Connects directly to PostgreSQL validate_stp_readiness RPC.
 */

import { createClient } from "@/lib/supabase/server";

export interface StpReadinessResult {
  studentId: string;
  jhsIndexNumber: string;
  ready: boolean;
  missing: string[];
  resultsCount: number;
}

export class StpService {
  /**
   * Validate a student's readiness using the authoritative database function
   */
  static async validateStudent(studentId: string): Promise<StpReadinessResult | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("validate_stp_readiness", {
      p_student_id: studentId,
    });

    if (error) {
      console.error("validate_stp_readiness RPC error:", error);
      return null;
    }

    const res = data as Record<string, unknown> | null;
    return {
      studentId: (res?.student_id as string) || studentId,
      jhsIndexNumber: (res?.jhs_index_number as string) || "",
      ready: Boolean(res?.ready),
      missing: Array.isArray(res?.missing) ? (res.missing as string[]) : [],
      resultsCount: Number(res?.results_count || 0),
    };
  }
}
