/**
 * Server-side Supabase client.
 * For use in Server Components and Route Handlers only.
 * Never import this file into client components.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — cookie setting is a no-op; middleware handles refresh
          }
        },
      },
    }
  );
}

/**
 * Service-role admin client — server-only.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY (NOT NEXT_PUBLIC_) so it is NEVER sent to
 * the browser. Required for privileged Auth operations such as
 * supabase.auth.admin.deleteUser().
 *
 * Returns null when the key is not configured so that callers can detect the
 * missing credential and surface a BLOCKED result instead of silently failing.
 *
 * IMPORTANT: Never call this from client components, never return the client
 * itself (or any value derived from the key) to the browser.
 */
export function createAdminClient(): ReturnType<typeof createSupabaseClient> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
