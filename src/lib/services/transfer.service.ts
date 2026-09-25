/**
 * Student Transfer Process (STP) Service
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DatabaseError } from "@/lib/errors";

export class TransferService {
  static revalidateTransferPaths(transferId?: string) {
    revalidatePath("/students/transfers");
    if (transferId) {
      revalidatePath(`/students/transfers/${transferId}`);
    }
    revalidatePath("/students");
    revalidatePath("/dashboard");
  }

  /**
   * Authoritative transfer reference generation using the PostgreSQL sequence RPC
   */
  static async generateReference(): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("generate_transfer_reference");

    if (error || !data) {
      console.error("generate_transfer_reference RPC failed:", error);
      throw new DatabaseError(
        "Could not generate authoritative transfer reference sequence. Please verify database connectivity."
      );
    }

    return String(data);
  }
}
