import { redirect } from "next/navigation";
import { authConfigured, createClient } from "@/lib/supabase/server";
import Home from "@/components/Home";

// Auth gate: signed-in users see the app; everyone else goes to /login. If auth
// env vars aren't configured yet (pre-cutover), fall back to rendering the app.
export default async function Page() {
  if (authConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }
  return <Home />;
}
