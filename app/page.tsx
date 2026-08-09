import { redirect } from "next/navigation";
import { authConfigured, createClient } from "@/lib/supabase/server";
import Home from "@/components/Home";

// Auth gate: signed-in users see the app; everyone else goes to /login. If auth
// env vars aren't configured yet (pre-cutover), fall back to rendering the app.
//
// Perf: use getSession() here (reads the cookie, no network) instead of
// getUser() (a round-trip to Supabase Auth). `middleware.ts` already validates +
// refreshes the session with getUser() on every request, and every API route
// re-checks getUser() server-side, so this gate stays safe — it just avoids a
// second auth round-trip in the critical path before the HTML paints.
export default async function Page() {
  if (authConfigured()) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) redirect("/login");
  }
  return <Home />;
}
