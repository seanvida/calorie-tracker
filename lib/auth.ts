import { authConfigured, createClient } from "@/lib/supabase/server";

/** The signed-in user's id, or null if not authenticated. Used to scope queries. */
export async function getUserId(): Promise<string | null> {
  if (!authConfigured()) return null; // not set up yet → treat as unauthenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
