import { Dashboard } from "@/components/dashboard";
import { createClient } from "@/lib/supabase-server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: references }, { data: boards }, { data: referenceBoards }] = user
    ? await Promise.all([
        supabase.from("references").select("*").order("created_at", { ascending: false }),
        supabase.from("boards").select("*").order("created_at", { ascending: false }),
        supabase.from("reference_boards").select("*").order("created_at", { ascending: false })
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  return (
    <Dashboard
      initialReferences={references ?? []}
      initialBoards={boards ?? []}
      initialReferenceBoards={referenceBoards ?? []}
      userEmail={user?.email ?? null}
      userId={user?.id ?? null}
    />
  );
}
